/** Per-request limits for the Node.js-only Naver lineup route. */
export const LINEUP_BUDGET_MS: number;
export const UPSTREAM_TIMEOUT_MS: number;

export function withLineupBudget(
  handler: () => Response | Promise<Response>,
  options?: { budgetMs?: number; signal?: AbortSignal | null },
): Promise<Response>;

export const boundedLineupFetch: typeof globalThis.fetch;
