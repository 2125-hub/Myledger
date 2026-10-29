import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Shell } from "@/components/shell";
import { computeStats, formatMoney, formatShort, periodOf, shiftPeriod } from "@/lib/ledger/model";
import { useLedger } from "@/lib/ledger/store";

export const Route = createFileRoute("/reports")({ component: Page });

function Page() {
  return (
    <Shell>
      <Reports />
    </Shell>
  );
}

function Reports() {
  const data = useLedger();
  const [period, setPeriod] = useState(() => periodOf(new Date(), data.settings.cycleStartDay));
  const stats = computeStats(data, period);
  const chart = stats.categories
    .filter((c) => c.gross > 0 || c.offset > 0)
    .slice(0, 8)
    .map((c) => ({ name: c.name.split(" / ").pop() ?? c.name, 淨額: Math.round(c.net) }));

  return (
    <main className="px-5 pt-8">
      <p className="text-sm text-muted">報表</p>
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

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-surface p-3">
          <p className="text-sm text-muted">支出淨額</p>
          <p className="mt-1 text-lg font-semibold text-expense">{formatMoney(stats.expenseNet)}</p>
        </div>
        <div className="rounded-lg bg-surface p-3">
          <p className="text-sm text-muted">收入</p>
          <p className="mt-1 text-lg font-semibold text-income">{formatMoney(stats.incomeBase)}</p>
          {stats.reimbursed > 0 && (
            <p className="mt-1 text-xs text-muted">代收 {formatMoney(stats.reimbursed)} 已沖回</p>
          )}
        </div>
      </div>

      <section className="mt-5 rounded-lg border border-line bg-surface p-3">
        <h2 className="text-sm font-medium">分類淨額</h2>
        {chart.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">這個週期還沒有計入預算的支出</p>
        ) : (
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#6e6a62", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(value) => formatMoney(Number(value))} cursor={{ fill: "#efece5" }} />
                <Bar dataKey="淨額" fill="#3e5c4e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <ul className="mt-4 flex flex-col gap-2">
        {stats.categories.map((cat) => (
          <li key={cat.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-3">
            <span>
              <span className="block text-sm font-medium">{cat.name}</span>
              <span className="text-xs text-muted">
                原始 {formatMoney(cat.gross)}
                {cat.offset ? ` · 沖銷 ${formatMoney(cat.offset)}` : ""}
              </span>
            </span>
            <span className="font-medium">{formatMoney(cat.net)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
