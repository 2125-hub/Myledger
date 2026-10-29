import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, PieChart, Plus, Settings, Wallet } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { TxEditor } from "@/components/tx-editor";
import { cn } from "@/lib/cn";
import { useLedgerSync } from "@/components/ledger-sync";
import type { TxType } from "@/lib/ledger/model";

interface EditorApi {
  openNew: (type?: TxType) => void;
  openEdit: (id: string) => void;
}

const EditorContext = createContext<EditorApi | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("editor missing");
  return ctx;
}

const NAV = [
  { to: "/", label: "記帳", icon: Wallet },
  { to: "/budgets", label: "預算", icon: PieChart },
  { to: "/reports", label: "報表", icon: BarChart3 },
  { to: "/settings", label: "設定", icon: Settings },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  useLedgerSync();
  const [editor, setEditor] = useState<{ id?: string; type?: TxType } | null>(null);

  const api: EditorApi = {
    openNew: (type) => setEditor({ type: type ?? "expense" }),
    openEdit: (id) => setEditor({ id }),
  };

  return (
    <EditorContext.Provider value={api}>
      <div className="min-h-screen bg-bg text-fg">
        <div className="mx-auto min-h-screen w-full max-w-lg pb-24">{children}</div>
        {path === "/" && (
          <button
            type="button"
            onClick={() => api.openNew("expense")}
            className="fixed right-5 bottom-24 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-fg shadow-sm"
            aria-label="記一筆"
          >
            <Plus className="size-6" />
          </button>
        )}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface">
          <ul className="mx-auto grid max-w-lg grid-cols-4">
            {NAV.map((item) => {
              const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-1 text-xs",
                      active ? "text-primary" : "text-muted",
                    )}
                  >
                    <Icon className="size-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {editor && <TxEditor id={editor.id} preset={editor.type} onClose={() => setEditor(null)} />}
      </div>
    </EditorContext.Provider>
  );
}
