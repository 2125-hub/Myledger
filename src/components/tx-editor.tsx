import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  BASE,
  childrenOf,
  evaluateAmount,
  expenseOffsetUsed,
  formatMoney,
  formatShort,
  nowTime,
  parentsOf,
  roundAmount,
  todayYmd,
  toBase,
  txBase,
  type Offset,
  type Transaction,
  type TxType,
} from "@/lib/ledger/model";
import { useLedger } from "@/lib/ledger/store";

const TYPES: { id: TxType; label: string }[] = [
  { id: "expense", label: "支出" },
  { id: "income", label: "收入" },
  { id: "transfer", label: "轉帳" },
];

interface DraftOffset {
  key: string;
  kind: "expense" | "category";
  expenseId: string;
  categoryId: string;
  amount: string;
}

export function TxEditor({
  id,
  preset,
  onClose,
}: {
  id?: string;
  preset?: TxType;
  onClose: () => void;
}) {
  const data = useLedger();
  const existing = data.transactions.find((t) => t.id === id);

  const [type, setType] = useState<TxType>(existing?.type ?? preset ?? "expense");
  const [date, setDate] = useState(existing?.date ?? todayYmd());
  const [time, setTime] = useState(existing?.time ?? nowTime());
  const [amountText, setAmountText] = useState(existing ? String(existing.amount) : "");
  const [pad, setPad] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(existing?.categoryId ?? null);
  const [projectId, setProjectId] = useState<string | null>(existing?.projectId ?? null);
  const [newProject, setNewProject] = useState("");
  const [accountId, setAccountId] = useState(existing?.accountId ?? data.accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(existing?.toAccountId ?? "");
  const [include, setInclude] = useState(
    existing?.includeInBudget ?? (preset ?? "expense") === "expense",
  );
  const [note, setNote] = useState(existing?.note ?? "");
  const [offsets, setOffsets] = useState<DraftOffset[]>(
    existing?.offsets.map((o) => ({
      key: o.id,
      kind: o.kind,
      expenseId: o.expenseId ?? "",
      categoryId: o.categoryId ?? "",
      amount: String(o.amountBase),
    })) ?? [],
  );
  const [error, setError] = useState("");

  const kind = type === "income" ? "income" : "expense";
  const parents = parentsOf(data.categories, kind);
  const parentSelected = data.categories.find((c) => c.id === categoryId);
  const activeParent =
    parentSelected?.parentId ?? (parentSelected && !parentSelected.parentId ? parentSelected.id : null);
  const children = activeParent ? childrenOf(data.categories, activeParent) : [];
  const account = data.accounts.find((a) => a.id === accountId);
  const currency = account?.currency ?? BASE;
  const parsed = evaluateAmount(amountText);
  const basePreview = parsed != null ? toBase(parsed, currency, data.settings.rates) : null;

  const expenses = useMemo(
    () =>
      data.transactions
        .filter((t) => t.type === "expense" && t.includeInBudget)
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [data.transactions],
  );

  function selectParent(pid: string) {
    const kids = childrenOf(data.categories, pid);
    setCategoryId(kids[0]?.id ?? pid);
  }

  function appendKey(key: string) {
    setAmountText((prev) => {
      if (key === "⌫") return prev.slice(0, -1);
      if (key === "C") return "";
      if ("+-×÷".includes(key) && (!prev || "+-×÷".includes(prev.slice(-1)))) {
        return (prev.slice(0, -1) || "") + key;
      }
      return prev + key;
    });
  }

  function commit() {
    if (parsed == null || parsed <= 0) {
      setError("請輸入有效金額");
      return;
    }
    if (!accountId) {
      setError("請選擇帳戶");
      return;
    }
    if (type !== "transfer" && !categoryId) {
      setError("請選擇分類");
      return;
    }
    if (type === "transfer") {
      if (!toAccountId) {
        setError("請選擇收款帳戶");
        return;
      }
      if (toAccountId === accountId) {
        setError("付款與收款帳戶不能相同");
        return;
      }
    }

    let project = projectId;
    const name = newProject.trim();
    if (name) {
      const found = data.projects.find((p) => p.name === name);
      if (found) project = found.id;
      else {
        project = crypto.randomUUID();
        data.addProject({ id: project, name });
      }
    }

    let nextOffsets: Offset[] = [];
    if (type === "income" && offsets.length) {
      const cap = basePreview ?? 0;
      let used = 0;
      for (const row of offsets) {
        const amountBase = evaluateAmount(row.amount);
        if (amountBase == null || amountBase <= 0) {
          setError("沖銷金額不正確");
          return;
        }
        if (row.kind === "expense" && !row.expenseId) {
          setError("請選擇要沖銷的支出");
          return;
        }
        if (row.kind === "category" && !row.categoryId) {
          setError("請選擇要沖減的分類");
          return;
        }
        used += amountBase;
        nextOffsets.push({
          id: row.key,
          kind: row.kind,
          expenseId: row.kind === "expense" ? row.expenseId : undefined,
          categoryId: row.kind === "category" ? row.categoryId : undefined,
          amountBase: Math.round(amountBase * 100) / 100,
        });
      }
      if (used - cap > 0.01) {
        setError("沖銷合計不能超過這筆收入的港幣金額");
        return;
      }
    }

    const tx: Transaction = {
      id: existing?.id ?? crypto.randomUUID(),
      type,
      date,
      time: time || "00:00",
      categoryId: type === "transfer" ? categoryId : categoryId,
      projectId: project,
      accountId,
      toAccountId: type === "transfer" ? toAccountId : null,
      includeInBudget: type === "transfer" ? false : include,
      amount: roundAmount(parsed, currency),
      note: note.trim(),
      offsets: type === "income" ? nextOffsets : [],
    };

    if (existing) data.updateTransaction(tx);
    else data.addTransaction(tx);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-bg">
      <div className="mx-auto min-h-screen w-full max-w-lg px-5 pt-5 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{existing ? "修改紀錄" : "記一筆"}</h2>
          <button type="button" onClick={onClose} className="flex size-11 items-center justify-center" aria-label="關閉">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-surface-2 p-1">
          {TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setType(item.id);
                setCategoryId(null);
                if (item.id === "expense") setInclude(true);
                if (item.id !== "expense") setInclude(false);
              }}
              className={cn(
                "min-h-11 rounded-lg text-sm font-medium",
                type === item.id ? "bg-surface text-fg shadow-sm" : "text-muted",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="mt-5 block text-sm text-muted">
          金額 {account ? `· ${account.currency}` : ""}
          <input
            inputMode="decimal"
            value={amountText}
            onChange={(e) => setAmountText(e.target.value)}
            placeholder="0"
            className="mt-1 h-14 w-full rounded-lg border border-line bg-surface px-3 text-2xl font-semibold"
          />
        </label>
        {basePreview != null && currency !== BASE && (
          <p className="mt-1 text-sm text-muted">約 {formatMoney(basePreview)}</p>
        )}
        <button type="button" onClick={() => setPad((v) => !v)} className="mt-2 text-sm text-primary">
          {pad ? "收起計算機" : "加減乘除"}
        </button>
        {pad && (
          <div className="mt-2 grid grid-cols-4 gap-2">
            {["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "⌫", "+"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => appendKey(key)}
                className="min-h-11 rounded-lg bg-surface-2 text-base"
              >
                {key}
              </button>
            ))}
            <button type="button" onClick={() => appendKey("C")} className="min-h-11 rounded-lg bg-surface-2">
              清除
            </button>
            <button
              type="button"
              onClick={() => {
                if (parsed != null) setAmountText(String(Math.round(parsed * 100) / 100));
              }}
              className="col-span-3 min-h-11 rounded-lg bg-primary text-primary-fg"
            >
              等於 {parsed != null ? formatMoney(parsed, currency) : ""}
            </button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm text-muted">
            日期
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3 text-fg"
            />
          </label>
          <label className="text-sm text-muted">
            時間
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3 text-fg"
            />
          </label>
        </div>

        {type !== "transfer" && (
          <fieldset className="mt-4">
            <legend className="text-sm text-muted">分類</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {parents.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectParent(p.id)}
                  className={cn(
                    "min-h-11 rounded-full px-3 text-sm",
                    activeParent === p.id ? "bg-primary text-primary-fg" : "bg-surface-2",
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {children.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {children.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      "min-h-11 rounded-full px-3 text-sm",
                      categoryId === c.id ? "bg-primary text-primary-fg" : "bg-surface",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </fieldset>
        )}

        <label className="mt-4 block text-sm text-muted">
          {type === "transfer" ? "付款帳戶" : "帳戶"}
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3"
          >
            {data.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.currency}
              </option>
            ))}
          </select>
        </label>

        {type === "transfer" && (
          <label className="mt-4 block text-sm text-muted">
            收款帳戶
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3"
            >
              <option value="">選擇帳戶</option>
              {data.accounts
                .filter((a) => a.id !== accountId)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.currency}
                  </option>
                ))}
            </select>
          </label>
        )}

        <label className="mt-4 block text-sm text-muted">
          項目（可選）
          <select
            value={projectId ?? ""}
            onChange={(e) => setProjectId(e.target.value || null)}
            className="mt-1 h-11 w-full rounded-lg border border-line bg-surface px-3"
          >
            <option value="">不指定</option>
            {data.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            placeholder="或輸入新項目"
            className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-3"
          />
        </label>

        {type !== "transfer" && (
          <button
            type="button"
            onClick={() => setInclude((v) => !v)}
            className="mt-4 flex min-h-11 w-full items-center justify-between rounded-lg border border-line bg-surface px-3 text-sm"
          >
            <span>計入預算</span>
            <span className={cn("font-medium", include ? "text-primary" : "text-muted")}>
              {include ? "是" : "否"}
            </span>
          </button>
        )}

        {type === "income" && (
          <section className="mt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">沖銷支出</h3>
              <button
                type="button"
                className="text-sm text-primary"
                onClick={() =>
                  setOffsets((rows) => [
                    ...rows,
                    { key: crypto.randomUUID(), kind: "expense", expenseId: "", categoryId: "", amount: "" },
                  ])
                }
              >
                新增
              </button>
            </div>
            <p className="mt-1 text-sm text-muted">可指定某筆支出，或直接沖減某個分類。分類不同也可以。</p>
            <div className="mt-3 flex flex-col gap-3">
              {offsets.map((row) => (
                <OffsetRow
                  key={row.key}
                  row={row}
                  expenses={expenses}
                  categories={data.categories.filter((c) => c.kind === "expense")}
                  incomeId={existing?.id}
                  onChange={(next) => setOffsets((rows) => rows.map((r) => (r.key === row.key ? next : r)))}
                  onRemove={() => setOffsets((rows) => rows.filter((r) => r.key !== row.key))}
                />
              ))}
            </div>
          </section>
        )}

        <label className="mt-4 block text-sm text-muted">
          備註
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2"
          />
        </label>

        {error && <p className="mt-3 text-sm text-expense">{error}</p>}

        <button type="button" onClick={commit} className="mt-5 min-h-12 w-full rounded-lg bg-primary text-primary-fg">
          儲存
        </button>
        {existing && (
          <button
            type="button"
            onClick={() => {
              data.deleteTransaction(existing.id);
              onClose();
            }}
            className="mt-2 min-h-11 w-full text-sm text-expense"
          >
            刪除這筆記錄
          </button>
        )}
      </div>
    </div>
  );
}

function OffsetRow({
  row,
  expenses,
  categories,
  incomeId,
  onChange,
  onRemove,
}: {
  row: DraftOffset;
  expenses: Transaction[];
  categories: { id: string; name: string; parentId: string | null }[];
  incomeId?: string;
  onChange: (row: DraftOffset) => void;
  onRemove: () => void;
}) {
  const transactions = useLedger((s) => s.transactions);
  const accounts = useLedger((s) => s.accounts);
  const rates = useLedger((s) => s.settings.rates);
  const cats = useLedger((s) => s.categories);

  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...row, kind: "expense" })}
          className={cn(
            "min-h-11 rounded-lg text-sm",
            row.kind === "expense" ? "bg-primary text-primary-fg" : "bg-surface-2",
          )}
        >
          指定支出
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...row, kind: "category" })}
          className={cn(
            "min-h-11 rounded-lg text-sm",
            row.kind === "category" ? "bg-primary text-primary-fg" : "bg-surface-2",
          )}
        >
          指定分類
        </button>
      </div>
      {row.kind === "expense" ? (
        <select
          value={row.expenseId}
          onChange={(e) => onChange({ ...row, expenseId: e.target.value })}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-2 text-sm"
        >
          <option value="">選擇支出</option>
          {expenses.map((tx) => {
            const base = txBase(tx, accounts, rates);
            const used = expenseOffsetUsed(transactions, tx.id, incomeId);
            const left = Math.max(0, base - used);
            return (
              <option key={tx.id} value={tx.id}>
                {formatShort(tx.date)} {cats.find((c) => c.id === tx.categoryId)?.name ?? "支出"} 餘{" "}
                {formatMoney(left)}
              </option>
            );
          })}
        </select>
      ) : (
        <select
          value={row.categoryId}
          onChange={(e) => onChange({ ...row, categoryId: e.target.value })}
          className="mt-2 h-11 w-full rounded-lg border border-line bg-surface px-2 text-sm"
        >
          <option value="">選擇分類</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.parentId ? `　${c.name}` : c.name}
            </option>
          ))}
        </select>
      )}
      <label className="mt-2 block text-sm text-muted">
        沖銷金額（港幣）
        <input
          inputMode="decimal"
          value={row.amount}
          onChange={(e) => onChange({ ...row, amount: e.target.value })}
          className="mt-1 h-11 w-full rounded-lg border border-line bg-bg px-3 text-fg"
        />
      </label>
      <button type="button" onClick={onRemove} className="mt-2 text-sm text-muted">
        移除
      </button>
    </div>
  );
}
