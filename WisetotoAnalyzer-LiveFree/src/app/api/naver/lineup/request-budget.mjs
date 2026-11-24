// Bound all upstream calls for one public lineup request without changing
// fixture identity, lineup evidence, or any frozen PRE/TOP1 decisions.
// AsyncLocalStorage keeps concurrent requests' deadlines isolated.
import { AsyncLocalStorage } from "node:async_hooks";

export const LINEUP_BUDGET_MS = 40_000;
export const UPSTREAM_TIMEOUT_MS = 8_000;
const requestBudget = new AsyncLocalStorage();

function timeoutError() {
  return new DOMException("Lineup upstream request timed out", "TimeoutError");
}

function budgetExceededResponse() {
  return Response.json(
    {
      ok: false,
      code: "LINEUP_BUDGET_EXCEEDED",
      error: "라인업 조회 시간 제한 초과: 확인되지 않은 명단은 제공하지 않습니다.",
      retryable: true,
    },
    { status: 504, headers: { "Cache-Control": "no-store" } },
  );
}

// Runs the existing handler unchanged, except that it cannot report success
// after the request's budget has expired.
export async function withLineupBudget(handler, { budgetMs = LINEUP_BUDGET_MS, signal } = {}) {
  if (!Number.isFinite(budgetMs) || budgetMs <= 0) {
    throw new RangeError("Lineup budget must be a positive number");
  }
  const controller = new AbortController();
  const onClientAbort = () => controller.abort(signal?.reason ?? timeoutError());
  if (signal?.aborted) onClientAbort();
  else signal?.addEventListener("abort", onClientAbort, { once: true });

  const deadline = performance.now() + budgetMs;
  const timer = setTimeout(() => controller.abort(timeoutError()), budgetMs);
  try {
    return await requestBudget.run({ deadline, signal: controller.signal }, async () => {
      try {
        const response = await handler();
        return controller.signal.aborted || performance.now() >= deadline ? budgetExceededResponse() : response;
      } catch (error) {
        if (controller.signal.aborted || performance.now() >= deadline) return budgetExceededResponse();
        throw error;
      }
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onClientAbort);
  }
}

// Drop-in replacement for global fetch in this module only.
// It also respects narrower pre-existing source-specific abort signals.
export function boundedLineupFetch(input, init = {}) {
  const budget = requestBudget.getStore();
  const remainingMs = budget ? budget.deadline - performance.now() : UPSTREAM_TIMEOUT_MS;
  if (budget?.signal.aborted || remainingMs <= 0) {
    return Promise.reject(timeoutError());
  }
  if (init?.signal?.aborted) {
    return Promise.reject(init.signal.reason ?? timeoutError());
  }
  // If the overall deadline is sooner, use its single controller. A second
  // rounded timer can fire first and let a caught timeout masquerade as success.
  const signals = [];
  if (!budget || remainingMs > UPSTREAM_TIMEOUT_MS) {
    signals.push(AbortSignal.timeout(UPSTREAM_TIMEOUT_MS));
  }
  if (budget) signals.push(budget.signal);
  if (init?.signal) signals.push(init.signal);

  return globalThis.fetch(input, {
    ...init,
    signal: AbortSignal.any(signals),
  });
}
