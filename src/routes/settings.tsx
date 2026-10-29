import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { authEnabled } from "@/lib/auth/client";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CURRENCIES, childrenOf, parentsOf, toCsv, type Category } from "@/lib/ledger/model";
import { useLedger } from "@/lib/ledger/store";

export const Route = createFileRoute("/settings")({ component: Page });

function Page() {
  return (
    <Shell>
      <SettingsPage />
    </Shell>
  );
}

function SettingsPage() {
  const data = useLedger();
  const { user, isPending } = useCurrentUserState();
  const [message, setMessage] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  function download() {
    const blob = new Blob([toCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qingzhang.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="px-5 pt-8 pb-8">
      <p className="text-sm text-muted">設定</p>
      <h1 className="mt-1 text-2xl font-semibold">帳本</h1>
      <p className="mt-2 text-sm text-muted">
        {user
          ? "已登入。改動會存到你的帳戶，換裝置用同一個帳戶登入即可繼續。"
          : "未登入時只存在這部瀏覽器。登入後會跟帳戶上的帳本同步。"}
      </p>
      <div className="mt-3">
        {authEnabled && !isPending && user ? (
          <UserButton />
        ) : (
          <Link to="/login" className="inline-flex min-h-11 items-center text-sm text-primary">
            登入以跨裝置保存
          </Link>
        )}
      </div>

      <section className="mt-6">
        <h2 className="font-medium">記帳週期</h2>
        <label className="mt-2 flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
          每月開始日
          <select
            value={data.settings.cycleStartDay}
            onChange={(e) => data.setCycleStart(Number(e.target.value))}
            className="h-11 rounded-lg border border-line bg-bg px-2"
          >
            <option value={0}>上個月最後一日</option>
            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day} 日
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-sm text-muted">
          {data.settings.cycleStartDay === 0
            ? "9 月從 8 月最後一日開始，到 9 月倒數第二日；10 月從 9 月最後一日開始。"
            : "例如選 25 日，週期就是本月 25 日至下月 24 日。"}
        </p>
      </section>

      <CategoryManager
        title="支出分類"
        kind="expense"
        onError={setMessage}
      />
      <CategoryManager title="收入分類" kind="income" onError={setMessage} />
      <AccountManager onError={setMessage} />
      <ProjectManager />

      <section className="mt-8">
        <h2 className="font-medium">匯率（1 單位兌換港幣）</h2>
        <div className="mt-2 flex flex-col gap-2">
          {CURRENCIES.filter((c) => c.code !== "HKD").map((c) => (
            <label key={c.code} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
              {c.name}
              <input
                defaultValue={String(data.settings.rates[c.code] ?? "")}
                inputMode="decimal"
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n) && n > 0) data.setRate(c.code, n);
                }}
                className="h-11 w-28 rounded-lg border border-line bg-bg px-2"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="mt-8 flex flex-col gap-2">
        <button type="button" onClick={download} className="min-h-11 rounded-lg bg-primary text-primary-fg">
          匯出 CSV
        </button>
        <button type="button" onClick={() => data.loadDemo()} className="min-h-11 rounded-lg bg-surface">
          載入午餐示例
        </button>
        {confirmReset ? (
          <div className="rounded-lg border border-line p-3">
            <p className="text-sm">清除後無法復原，分類會回到預設。</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => data.resetAll()} className="min-h-11 flex-1 rounded-lg bg-expense text-primary-fg">
                確定清除
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="min-h-11 flex-1 rounded-lg bg-surface">
                取消
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className="min-h-11 text-sm text-expense">
            清除全部資料
          </button>
        )}
        {message && <p className="text-sm text-expense">{message}</p>}
      </section>
    </main>
  );
}

function CategoryManager({
  title,
  kind,
  onError,
}: {
  title: string;
  kind: "expense" | "income";
  onError: (msg: string) => void;
}) {
  const data = useLedger();
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const parents = parentsOf(data.categories, kind);

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const category: Category = {
      id: crypto.randomUUID(),
      name: trimmed,
      parentId: parent || null,
      kind,
    };
    data.addCategory(category);
    setName("");
  }

  return (
    <section className="mt-8">
      <h2 className="font-medium">{title}</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {parents.map((p) => (
          <li key={p.id} className="rounded-lg bg-surface p-3">
            <NameRow
              name={p.name}
              onRename={(n) => data.renameCategory(p.id, n)}
              onDelete={() => {
                const err = data.deleteCategory(p.id);
                onError(err ?? "");
              }}
            />
            <ul className="mt-2 flex flex-col gap-2 pl-3">
              {childrenOf(data.categories, p.id).map((c) => (
                <li key={c.id}>
                  <NameRow
                    name={c.name}
                    onRename={(n) => data.renameCategory(c.id, n)}
                    onDelete={() => {
                      const err = data.deleteCategory(c.id);
                      onError(err ?? "");
                    }}
                  />
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="新分類"
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3"
        />
        <select
          value={parent}
          onChange={(e) => setParent(e.target.value)}
          className="h-11 rounded-lg border border-line bg-surface px-2 text-sm"
        >
          <option value="">大分類</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} 的子類
            </option>
          ))}
        </select>
        <button type="button" onClick={add} className="min-h-11 rounded-lg bg-primary px-3 text-sm text-primary-fg">
          新增
        </button>
      </div>
    </section>
  );
}

function AccountManager({ onError }: { onError: (msg: string) => void }) {
  const data = useLedger();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("HKD");
  return (
    <section className="mt-8">
      <h2 className="font-medium">帳戶</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {data.accounts.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
            <span className="text-sm">
              {a.name}
              <span className="text-muted"> · {a.currency}</span>
            </span>
            <button
              type="button"
              className="min-h-11 px-2 text-sm text-muted"
              onClick={() => {
                const err = data.deleteAccount(a.id);
                onError(err ?? "");
              }}
            >
              刪除
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="新帳戶"
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="h-11 rounded-lg border border-line bg-surface px-2"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="min-h-11 rounded-lg bg-primary px-3 text-sm text-primary-fg"
          onClick={() => {
            if (!name.trim()) return;
            data.addAccount({ id: crypto.randomUUID(), name: name.trim(), currency });
            setName("");
          }}
        >
          新增
        </button>
      </div>
    </section>
  );
}

function ProjectManager() {
  const data = useLedger();
  const [name, setName] = useState("");
  return (
    <section className="mt-8">
      <h2 className="font-medium">項目</h2>
      <ul className="mt-2 flex flex-col gap-2">
        {data.projects.length === 0 && <li className="text-sm text-muted">還沒有項目。記帳時也可以直接新增。</li>}
        {data.projects.map((p) => (
          <li key={p.id}>
            <NameRow
              name={p.name}
              onRename={(n) => data.renameProject(p.id, n)}
              onDelete={() => data.deleteProject(p.id)}
            />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="新項目"
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3"
        />
        <button
          type="button"
          className="min-h-11 rounded-lg bg-primary px-3 text-sm text-primary-fg"
          onClick={() => {
            if (!name.trim()) return;
            data.addProject({ id: crypto.randomUUID(), name: name.trim() });
            setName("");
          }}
        >
          新增
        </button>
      </div>
    </section>
  );
}

function NameRow({
  name,
  onRename,
  onDelete,
}: {
  name: string;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(name);
  if (editing) {
    return (
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-2"
        />
        <button
          type="button"
          className="text-sm text-primary"
          onClick={() => {
            if (text.trim()) onRename(text.trim());
            setEditing(false);
          }}
        >
          完成
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm">{name}</span>
      <span className="flex gap-1">
        <button type="button" className="min-h-11 px-2 text-sm text-muted" onClick={() => setEditing(true)}>
          改名
        </button>
        <button type="button" className="min-h-11 px-2 text-sm text-muted" onClick={onDelete}>
          刪除
        </button>
      </span>
    </div>
  );
}
