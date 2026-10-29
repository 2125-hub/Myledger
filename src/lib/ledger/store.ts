import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  demoPatch,
  seedData,
  type Account,
  type Category,
  type LedgerData,
  type Project,
  type Transaction,
} from "@/lib/ledger/model";

interface Actions {
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  addCategory: (category: Category) => void;
  renameCategory: (id: string, name: string) => void;
  deleteCategory: (id: string) => string | null;
  addAccount: (account: Account) => void;
  updateAccount: (account: Account) => void;
  deleteAccount: (id: string) => string | null;
  addProject: (project: Project) => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  setBudget: (key: string, amount: number | null) => void;
  setCycleStart: (day: number) => void;
  replaceData: (data: LedgerData) => void;
  setRate: (code: string, rate: number) => void;
  loadDemo: () => void;
  resetAll: () => void;
}

export type LedgerStore = LedgerData & Actions;

export const useLedger = create<LedgerStore>()(
  persist(
    (set, get) => ({
      ...seedData(),
      addTransaction: (tx) => set({ transactions: [tx, ...get().transactions] }),
      updateTransaction: (tx) =>
        set({ transactions: get().transactions.map((item) => (item.id === tx.id ? tx : item)) }),
      deleteTransaction: (id) =>
        set({
          transactions: get()
            .transactions.filter((item) => item.id !== id)
            .map((item) => ({
              ...item,
              offsets: item.offsets.filter((offset) => offset.expenseId !== id),
            })),
        }),
      addCategory: (category) => set({ categories: [...get().categories, category] }),
      renameCategory: (id, name) =>
        set({
          categories: get().categories.map((c) => (c.id === id ? { ...c, name } : c)),
        }),
      deleteCategory: (id) => {
        const data = get();
        const hasChild = data.categories.some((c) => c.parentId === id);
        if (hasChild) return "請先刪除子分類";
        const used = data.transactions.some(
          (t) => t.categoryId === id || t.offsets.some((o) => o.categoryId === id),
        );
        if (used) return "已有紀錄使用此分類";
        const budgets = { ...data.budgets };
        delete budgets[id];
        set({ categories: data.categories.filter((c) => c.id !== id), budgets });
        return null;
      },
      addAccount: (account) => set({ accounts: [...get().accounts, account] }),
      updateAccount: (account) =>
        set({ accounts: get().accounts.map((a) => (a.id === account.id ? account : a)) }),
      deleteAccount: (id) => {
        const used = get().transactions.some((t) => t.accountId === id || t.toAccountId === id);
        if (used) return "已有紀錄使用此帳戶";
        if (get().accounts.length <= 1) return "至少保留一個帳戶";
        set({ accounts: get().accounts.filter((a) => a.id !== id) });
        return null;
      },
      addProject: (project) => set({ projects: [...get().projects, project] }),
      renameProject: (id, name) =>
        set({ projects: get().projects.map((p) => (p.id === id ? { ...p, name } : p)) }),
      deleteProject: (id) =>
        set({
          projects: get().projects.filter((p) => p.id !== id),
          transactions: get().transactions.map((t) =>
            t.projectId === id ? { ...t, projectId: null } : t,
          ),
        }),
      setBudget: (key, amount) => {
        const budgets = { ...get().budgets };
        if (amount == null || Number.isNaN(amount)) delete budgets[key];
        else budgets[key] = amount;
        set({ budgets });
      },
      setCycleStart: (day) =>
        set({
          settings: {
            ...get().settings,
            cycleStartDay: day === 0 ? 0 : Math.min(28, Math.max(1, day)),
          },
        }),
      setRate: (code, rate) =>
        set({
          settings: {
            ...get().settings,
            rates: { ...get().settings.rates, [code]: rate },
          },
        }),
      loadDemo: () => set(demoPatch(get())),
      resetAll: () => set(seedData()),
      replaceData: (data) =>
        set({
          categories: data.categories,
          projects: data.projects,
          accounts: data.accounts,
          transactions: data.transactions,
          budgets: data.budgets,
          settings: data.settings,
        }),
    }),
    { name: "qingzhang-v1", skipHydration: true },
  ),
);
