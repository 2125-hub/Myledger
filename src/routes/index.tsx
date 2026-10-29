import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Shell, useEditor } from "@/components/shell";
import { cn } from "@/lib/cn";
import {
  accountBalance,
  categoryPath,
  computeStats,
  formatDay,
  formatMoney,
  formatShort,
  inPeriod,
  periodOf,
  shiftPeriod,
  txBase,
  type TxType,
} from "@/lib/ledger/model";
import { useLedger } from "@/lib/ledger/store";

export const Route = createFileRoute("/")({ component: Page });

function Page() {
  return (
    <Shell>
      <Home />
    </Shell>
  );
}

function Home() {
  const data = useLedger();
  const editor = useEditor();
  const [cursor, setCursor] = useState(() => periodOf(new Date(), data.settings.cycleStartDay));
  const period = useMemo(() => {
    const live = periodOf(new Date(), data.settings.cycleStartDay);
    if (cursor.start === live.start) return live;
    return shiftPeriod({ start: cursor.start, end: cursor.end }, data.settings.cycleStartDay, 0);
  }, [cursor, data.settings.cycleStartDay]);
  const [filter, setFilter] = useState<"all" | TxType>("all");
  const [query, setQuery] = useState("");

  const stats = computeStats(data, period);
  const rows = data.transactions
    .filter((tx) => inPeriod(tx.date, period))
    .filter((tx) => (filter === "all" ? true : tx.type === filter))
    .filter((tx) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      const cat = categoryPath(data.categories, tx.categoryId);
      const account = data.accounts.find((a) => a.id === tx.accountId)?.name ?? "";
      const project = data.projects.find((p) => p.id === tx.projectId)?.name ?? "";
      return `${cat} ${account} ${project} ${tx.note} ${tx.amount}`.toLowerCase().includes(q);
    })
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const groups = new Map<string, typeof rows>();
  for (const tx of rows) {
    const list = groups.get(tx.date) ?? [];
    list.push(tx);
    groups.set(tx.date, list);
  }

  const remain =
    stats.totalBudget != null ? stats.totalBudget - stats.expenseNet : null;
  const ratio =
    stats.totalBudget && stats.totalBudget > 0
      ? Math.min(100, Math.max(0, (stats.expenseNet / stats.totalBudget) * 100))
      : 0;

  return (
    <main className="px-5 pt-8">
      <p className="text-sm text-muted">清帳</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {formatShort(period.start)} – {formatShort(period.end)}
        </h1>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="上一個週期"
            className="flex size-11 items-center justify-center rounded-lg bg-surface"
            onClick={() => setCursor(shiftPeriod(period, data.settings.cycleStartDay, -1))}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="下一個週期"
            className="flex size-11 items-center justify-center rounded-lg bg-surface"
            onClick={() => setCursor(shiftPeriod(period, data.settings.cycleStartDay, 1))}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <section className="mt-5 rounded-lg border border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">實際開支</p>
            <p className="mt-1 text-2xl font-semibold text-expense">{formatMoney(stats.expenseNet)}</p>
            {stats.offsetTotal > 0 && (
              <p className="mt-1 text-xs text-muted">
                原始 {formatMoney(stats.expenseGross)}，已沖銷 {formatMoney(stats.offsetTotal)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">本期收入</p>
            <p className="mt-1 text-lg font-semibold text-income">{formatMoney(stats.incomeBase)}</p>
            {stats.reimbursed > 0 && (
              <p className="mt-1 text-xs text-muted">代收 {formatMoney(stats.reimbursed)} 已沖回，不算收入</p>
            )}
          </div>
        </div>
        {stats.totalBudget != null && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted">
              <span>總預算 {formatMoney(stats.totalBudget)}</span>
              <span className={remain != null && remain < 0 ? "text-expense" : ""}>
                剩餘 {formatMoney(remain ?? 0)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-primary" style={{ width: `${ratio}%` }} />
            </div>
          </div>
        )}
      </section>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {data.accounts.map((account) => {
          const bal = accountBalance(data, account.id);
          return (
            <div key={account.id} className="min-w-28 shrink-0 rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-xs text-muted">{account.name}</p>
              <p className={cn("mt-1 text-sm font-medium", bal < 0 && "text-expense")}>
                {formatMoney(bal, account.currency)}
              </p>
            </div>
          );
        })}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜尋分類、帳戶、備註"
        className="mt-4 h-11 w-full rounded-lg border border-line bg-surface px-3"
      />
      <div className="mt-3 flex gap-2">
        {(
          [
            ["all", "全部"],
            ["expense", "支出"],
            ["income", "收入"],
            ["transfer", "轉帳"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "min-h-11 rounded-full px-3 text-sm",
              filter === id ? "bg-primary text-primary-fg" : "bg-surface",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {data.transactions.length === 0 && (
        <div className="mt-8 rounded-lg border border-line bg-surface p-5">
          <p className="font-medium">帳本還是空的</p>
          <p className="mt-1 text-sm text-muted">記一筆支出，或先看代付午餐怎麼算成實際 80 元。</p>
          <button
            type="button"
            onClick={() => data.loadDemo()}
            className="mt-4 min-h-11 rounded-lg bg-primary px-4 text-sm text-primary-fg"
          >
            載入午餐示例
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-5">
        {[...groups.entries()].map(([date, list]) => (
          <section key={date}>
            <h2 className="text-sm text-muted">{formatDay(date)}</h2>
            <ul className="mt-2 overflow-hidden rounded-lg border border-line bg-surface">
              {list.map((tx) => {
                const base = txBase(tx, data.accounts, data.settings.rates);
                const currency = data.accounts.find((a) => a.id === tx.accountId)?.currency ?? "HKD";
                const offsetSum = tx.offsets.reduce((s, o) => s + o.amountBase, 0);
                const reimbursed = tx.type === "income" && offsetSum > 0;
                const sign = tx.type === "expense" ? -1 : tx.type === "income" && !reimbursed ? 1 : 0;
                const against = data.transactions
                  .filter((t) => t.type === "income")
                  .flatMap((t) => t.offsets)
                  .filter((o) => o.expenseId === tx.id)
                  .reduce((s, o) => s + o.amountBase, 0);
                return (
                  <li key={tx.id} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => editor.openEdit(tx.id)}
                      className="flex w-full items-start justify-between gap-3 px-3 py-3 text-left"
                    >
                      <span>
                        <span className="block font-medium">
                          {tx.type === "transfer"
                            ? "轉帳"
                            : reimbursed
                              ? "代收沖銷"
                              : categoryPath(data.categories, tx.categoryId)}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          {data.accounts.find((a) => a.id === tx.accountId)?.name}
                          {tx.toAccountId
                            ? ` → ${data.accounts.find((a) => a.id === tx.toAccountId)?.name ?? ""}`
                            : ""}
                          {tx.note ? ` · ${tx.note}` : ""}
                        </span>
                        {tx.type === "expense" && against > 0 && (
                          <span className="mt-1 block text-xs text-muted">
                            淨額 {formatMoney(base - against)} · 已沖銷 {formatMoney(against)}
                          </span>
                        )}
                        {tx.type === "income" && offsetSum > 0 && (
                          <span className="mt-1 block text-xs text-muted">
                            沖回開支 {formatMoney(offsetSum)}，不計入收入
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-medium",
                          sign < 0 && "text-expense",
                          sign > 0 && "text-income",
                        )}
                      >
                        {tx.type === "expense" ? "−" : sign > 0 ? "+" : ""}
                        {formatMoney(tx.amount, currency)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      {data.transactions.length > 0 && rows.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">這個週期沒有符合的紀錄</p>
      )}
    </main>
  );
}
