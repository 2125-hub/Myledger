import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { seedData, type LedgerData } from "@/lib/ledger/model";

function coerce(input: unknown): LedgerData | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Partial<LedgerData>;
  const seed = seedData();
  return {
    categories: Array.isArray(data.categories) && data.categories.length ? data.categories : seed.categories,
    projects: Array.isArray(data.projects) ? data.projects : [],
    accounts: Array.isArray(data.accounts) && data.accounts.length ? data.accounts : seed.accounts,
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    budgets: data.budgets && typeof data.budgets === "object" ? data.budgets : {},
    settings: {
      cycleStartDay: data.settings?.cycleStartDay ?? 1,
      rates: { ...seed.settings.rates, ...(data.settings?.rates ?? {}) },
    },
  };
}

export const loadLedger = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql<{ data: unknown }>`
      select data from ledgers where user_id = ${context.userId}
    `;
    const data = coerce(rows[0]?.data);
    return data ? { data } : null;
  });

export const saveLedger = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { data: LedgerData }) => {
    if (!input?.data || typeof input.data !== "object") throw new Error("缺少帳本");
    return input;
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const payload = JSON.stringify(data.data);
    await sql`
      insert into ledgers (user_id, data)
      values (${context.userId}, ${payload}::jsonb)
      on conflict (user_id) do update
        set data = excluded.data, updated_at = now()
    `;
    return { ok: true as const };
  });
