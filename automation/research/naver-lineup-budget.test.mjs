import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  LINEUP_BUDGET_MS,
  UPSTREAM_TIMEOUT_MS,
  boundedLineupFetch,
  withLineupBudget,
} from "../../WisetotoAnalyzer-LiveFree/src/app/api/naver/lineup/request-budget.mjs";

function delayedResponse(delayMs) {
  return (_input, { signal }) => new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    }, delayMs);
    function onAbort() {
      clearTimeout(timer);
      reject(signal.reason);
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

test("lineup budget is 40s, source fetches max 8s, deployment cap is 50s", async () => {
  assert.equal(LINEUP_BUDGET_MS, 40_000);
  assert.equal(UPSTREAM_TIMEOUT_MS, 8_000);
  const route = await readFile(
    new URL("../../WisetotoAnalyzer-LiveFree/src/app/api/naver/lineup/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(route, /export const runtime = "nodejs"/);
  assert.match(route, /export const maxDuration = 50/);
  assert.match(route, /import \{ boundedLineupFetch as fetch, withLineupBudget \} from "\.\/request-budget\.mjs"/);
  assert.match(route, /async function handleLineupRequest\(request: Request\)/);
  assert.match(route, /return withLineupBudget\(\(\) => handleLineupRequest\(request\), \{ signal: request\.signal \}\)/);
  assert.match(route, /LINEUP|lineup|라인업/);
  // No existing source-selection/PRE/TOP1 code has to be modified for the cap.
  assert.ok(route.split("\n").length > 5_000);
});

test("fast upstream reads keep the original response and preserve init headers", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    calls.push({ input, init });
    return new Response('{"ok":true}', { status: 200 });
  });
  const response = await withLineupBudget(
    () => boundedLineupFetch("https://api-gw.sports.naver.com/test", {
      cache: "no-store", headers: { Accept: "application/json" },
    }),
    { budgetMs: 1_000 },
  );
  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.headers.Accept, "application/json");
  assert.equal(calls[0].init.signal.aborted, false);
});

test("a stalled source aborts at the overall deadline, never reports success", async (t) => {
  t.mock.method(globalThis, "fetch", delayedResponse(500));
  const start = Date.now();
  const response = await withLineupBudget(async () => {
    try {
      await boundedLineupFetch("https://api-gw.sports.naver.com/slow");
      return Response.json({ ok: true });
    } catch {
      // Even if the original route's fallback catches the abort, the
      // outer budget rejects a misleading successful/partial result.
      return Response.json({ ok: true, lineup: [] });
    }
  }, { budgetMs: 45 });
  assert.equal(response.status, 504);
  const payload = await response.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "LINEUP_BUDGET_EXCEEDED");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok(Date.now() - start < 300);
});

test("two overlapping requests get independent abort deadlines", async (t) => {
  t.mock.method(globalThis, "fetch", delayedResponse(120));
  const [slow, fast] = await Promise.all([
    withLineupBudget(() => boundedLineupFetch("https://example.org/timeout"), { budgetMs: 40 }),
    withLineupBudget(() => boundedLineupFetch("https://example.org/success"), { budgetMs: 400 }),
  ]);
  assert.equal(slow.status, 504);
  assert.equal(fast.status, 200);
});

test("existing source-specific abort signals are respected", async (t) => {
  t.mock.method(globalThis, "fetch", delayedResponse(250));
  const response = await withLineupBudget(async () => {
    try {
      await boundedLineupFetch("https://example.org/source", {
        signal: AbortSignal.timeout(35),
      });
      return Response.json({ ok: true });
    } catch {
      return Response.json({ ok: false, error: "source unavailable" }, { status: 503 });
    }
  }, { budgetMs: 500 });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).ok, false);
});

test("already cancelled client request cannot start another fetch", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async () => {
    calls.push(1);
    return Response.json({ ok: true });
  });
  const client = new AbortController();
  client.abort();
  const response = await withLineupBudget(
    () => boundedLineupFetch("https://example.org/blocked"),
    { budgetMs: 500, signal: client.signal },
  );
  assert.equal(response.status, 504);
  assert.deepEqual(calls, []);
});

test("invalid deadlines are rejected instead of disabling time limits", async () => {
  await assert.rejects(() => withLineupBudget(
    async () => Response.json({ ok: true }),
    { budgetMs: -1 },
  ), RangeError);
});
