import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Shell } from "@/components/shell";
import {
  childrenOf,
  computeStats,
  formatMoney,
  formatShort,
  parentsOf,
  periodOf,
  shiftPeriod,
} from "@/lib/ledger/model";
import { useLedger } from "@/lib/ledger/store";

export const Route = createFileRoute("/budgets")({ component: Page });

function Page() {
  return (
    <Shell>
      <Budgets />
    </Shell>
  );
}

function Budgets() {
  const data = useLedger();
  const [period, setPeriod] = useState(() => periodOf(new Date(), data.settings.cycleStartDay));
  const stats = computeStats(data, period);
  const parents = parentsOf(data.categories, "expense");

  return (
    <main className="px-5 pt-8">
      <p className="text-sm text-muted">預算</p>
      <div className="mt-1 flex items-end justify-between">
        <h1 className="text-2xl font-semibold">
          {formatShort(period.start)} – {formatShort(period.end)}
        </h1>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="上一週期"
            className="flex size-11 items-center justify-center rounded-lg bg-surface"
            onClick={() => setPeriod(shiftPeriod(period, data.settings.cycleStartDay, -1))}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="下一週期"
            className="flex size-11 items-center justify-center rounded-lg bg-surface"
            onClick={() => setPeriod(shiftPeriod(period, data.settings.cycleStartDay, 1))}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted">
        代付可以照實記，再用收入沖銷。預算看的是淨額，每一筆交易都還在。
      </p>

      <BudgetRow
        label="每月總預算"
        amount={data.budgets.total ?? null}
        net={stats.expenseNet}
        gross={stats.expenseGross}
        onChange={(n) => data.setBudget("total", n)}
      />

      <div className="mt-6 flex flex-col gap-3">
        {parents.map((parent) => {
          const kids = childrenOf(data.categories, parent.id);
          const targets = kids.length ? kids : [parent];
          return (
            <section key={parent.id}>
              <h2 className="text-sm text-muted">{parent.name}</h2>
              <div className="mt-2 flex flex-col gap-2">
                {targets.map((cat) => {
                  const roll = stats.categories.find((c) => c.id === cat.id);
                  return (
                    <BudgetRow
                      key={cat.id}
                      label={cat.name}
                      amount={data.budgets[cat.id] ?? null}
                      net={roll?.net ?? 0}
                      gross={roll?.gross ?? 0}
                      onChange={(n) => data.setBudget(cat.id, n)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function BudgetRow({
  label,
  amount,
  net,
  gross,
  onChange,
}: {
  label: string;
  amount: number | null;
  net: number;
  gross: number;
  onChange: (n: number | null) => void;
}) {
  const [text, setText] = useState(amount == null ? "" : String(amount));
  const ratio = amount && amount > 0 ? Math.min(100, Math.max(0, (net / amount) * 100)) : 0;
  const over = amount != null && net > amount;
  return (
    <div className="mt-3 rounded-lg border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{label}</p>
        <label className="text-sm text-muted">
          上限
          <input
            inputMode="decimal"
            value={text}
            placeholder="不設"
            onChange={(e) => setText(e.target.value)}
            onBlur={() => {
              const trimmed = text.trim();
              if (!trimmed) {
                onChange(null);
                return;
              }
              const n = Number(trimmed);
              if (Number.isFinite(n) && n >= 0) onChange(n);
            }}
            className="ml-2 h-11 w-28 rounded-lg border border-line bg-bg px-2 text-fg"
          />
        </label>
      </div>
      <p className={`mt-2 text-sm ${over ? "text-expense" : "text-muted"}`}>
        淨額 {formatMoney(net)}
        {gross !== net ? ` · 原始 ${formatMoney(gross)}` : ""}
        {amount != null ? ` · 剩餘 ${formatMoney(amount - net)}` : ""}
      </p>
      {amount != null && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className={`h-full ${over ? "bg-expense" : "bg-primary"}`} style={{ width: `${ratio}%` }} />
        </div>
      )}
    </div>
  );
}
