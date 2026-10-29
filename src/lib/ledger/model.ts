export type TxType = "expense" | "income" | "transfer";

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  kind: "expense" | "income";
}

export interface Project {
  id: string;
  name: string;
}

export interface Account {
  id: string;
  name: string;
  currency: string;
}

export interface Offset {
  id: string;
  kind: "expense" | "category";
  expenseId?: string;
  categoryId?: string;
  amountBase: number;
}

export interface Transaction {
  id: string;
  type: TxType;
  date: string;
  time: string;
  categoryId: string | null;
  projectId: string | null;
  accountId: string;
  toAccountId: string | null;
  includeInBudget: boolean;
  amount: number;
  note: string;
  offsets: Offset[];
}

export interface Settings {
  cycleStartDay: number;
  rates: Record<string, number>;
}

export interface LedgerData {
  categories: Category[];
  projects: Project[];
  accounts: Account[];
  transactions: Transaction[];
  budgets: Record<string, number>;
  settings: Settings;
}

export const CURRENCIES: { code: string; name: string; symbol: string; digits: number }[] = [
  { code: "HKD", name: "港幣", symbol: "HK$", digits: 2 },
  { code: "USD", name: "美元", symbol: "US$", digits: 2 },
  { code: "CNY", name: "人民幣", symbol: "¥", digits: 2 },
  { code: "EUR", name: "歐元", symbol: "€", digits: 2 },
  { code: "GBP", name: "英鎊", symbol: "£", digits: 2 },
  { code: "JPY", name: "日圓", symbol: "¥", digits: 0 },
  { code: "TWD", name: "新台幣", symbol: "NT$", digits: 0 },
  { code: "SGD", name: "新加坡元", symbol: "S$", digits: 2 },
  { code: "AUD", name: "澳元", symbol: "A$", digits: 2 },
  { code: "KRW", name: "韓圜", symbol: "₩", digits: 0 },
];

export const BASE = "HKD";

const DEFAULT_RATES: Record<string, number> = {
  HKD: 1,
  USD: 7.78,
  CNY: 1.09,
  EUR: 9.05,
  GBP: 10.35,
  JPY: 0.051,
  TWD: 0.24,
  SGD: 6.02,
  AUD: 5.15,
  KRW: 0.0055,
};

export function currencyMeta(code: string) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function seedData(): LedgerData {
  return {
    categories: [
      { id: "c-food", name: "食物", parentId: null, kind: "expense" },
      { id: "c-bf", name: "早餐", parentId: "c-food", kind: "expense" },
      { id: "c-lunch", name: "午餐", parentId: "c-food", kind: "expense" },
      { id: "c-din", name: "晚餐", parentId: "c-food", kind: "expense" },
      { id: "c-snack", name: "小吃", parentId: "c-food", kind: "expense" },
      { id: "c-trans", name: "交通", parentId: null, kind: "expense" },
      { id: "c-shop", name: "購物", parentId: null, kind: "expense" },
      { id: "c-home", name: "居住", parentId: null, kind: "expense" },
      { id: "c-fun", name: "娛樂", parentId: null, kind: "expense" },
      { id: "c-other-e", name: "其他支出", parentId: null, kind: "expense" },
      { id: "c-salary", name: "薪金", parentId: null, kind: "income" },
      { id: "c-other-i", name: "其他收入", parentId: null, kind: "income" },
      { id: "c-reimb", name: "代收代付", parentId: null, kind: "income" },
    ],
    projects: [],
    accounts: [
      { id: "a-cash", name: "現金", currency: "HKD" },
      { id: "a-bank", name: "銀行戶口", currency: "HKD" },
      { id: "a-card", name: "信用卡", currency: "HKD" },
      { id: "a-payme", name: "PayMe", currency: "HKD" },
    ],
    transactions: [],
    budgets: {},
    settings: { cycleStartDay: 1, rates: { ...DEFAULT_RATES } },
  };
}

export function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function todayYmd(): string {
  return ymd(new Date());
}

export function nowTime(): string {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

export function formatDay(value: string): string {
  const date = parseYmd(value);
  return `${date.getMonth() + 1}月${date.getDate()}日 週${WEEK[date.getDay()]}`;
}

export function formatShort(value: string): string {
  const date = parseYmd(value);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export interface Period {
  start: string;
  end: string;
}

export function periodOf(date: Date, startDay: number): Period {
  if (startDay === 0) return monthEndPeriod(date);
  const day = Math.min(Math.max(startDay, 1), 28);
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = date.getDate() >= day ? new Date(y, m, day) : new Date(y, m - 1, day);
  const next = new Date(start.getFullYear(), start.getMonth() + 1, day);
  const end = new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1);
  return { start: ymd(start), end: ymd(end) };
}

function monthEndPeriod(date: Date): Period {
  const y = date.getFullYear();
  const m = date.getMonth();
  const lastThis = new Date(y, m + 1, 0).getDate();
  const start = date.getDate() === lastThis ? new Date(y, m, lastThis) : new Date(y, m, 0);
  const next = new Date(start.getFullYear(), start.getMonth() + 2, 0);
  const end = new Date(next.getFullYear(), next.getMonth(), next.getDate() - 1);
  return { start: ymd(start), end: ymd(end) };
}

export function shiftPeriod(period: Period, startDay: number, delta: number): Period {
  const start = parseYmd(period.start);
  if (startDay === 0) {
    const moved = new Date(start.getFullYear(), start.getMonth() + delta + 1, 0);
    return periodOf(moved, 0);
  }
  const anchor = new Date(start.getFullYear(), start.getMonth() + delta, start.getDate());
  return periodOf(anchor, startDay);
}

export function inPeriod(date: string, period: Period): boolean {
  return date >= period.start && date <= period.end;
}

export function toBase(amount: number, currency: string, rates: Record<string, number>): number {
  const rate = rates[currency] ?? (currency === BASE ? 1 : 0);
  return amount * rate;
}

export function formatMoney(amount: number, currency = BASE): string {
  const meta = currencyMeta(currency);
  const abs = Math.abs(amount);
  const body = abs.toLocaleString("zh-HK", {
    minimumFractionDigits: meta.digits,
    maximumFractionDigits: meta.digits,
  });
  const sign = amount < 0 ? "-" : "";
  return `${sign}${meta.symbol}${body}`;
}

export function roundAmount(amount: number, currency: string): number {
  const digits = currencyMeta(currency).digits;
  const f = 10 ** digits;
  return Math.round(amount * f) / f;
}

export function categoryPath(categories: Category[], id: string | null): string {
  if (!id) return "未分類";
  const cat = categories.find((c) => c.id === id);
  if (!cat) return "未分類";
  if (!cat.parentId) return cat.name;
  const parent = categories.find((c) => c.id === cat.parentId);
  return parent ? `${parent.name} / ${cat.name}` : cat.name;
}

export function parentsOf(categories: Category[], kind: "expense" | "income"): Category[] {
  return categories.filter((c) => c.kind === kind && !c.parentId);
}

export function childrenOf(categories: Category[], parentId: string): Category[] {
  return categories.filter((c) => c.parentId === parentId);
}

export interface CatRollup {
  id: string;
  name: string;
  gross: number;
  offset: number;
  net: number;
  budget: number | null;
}

export interface PeriodStats {
  expenseGross: number;
  expenseNet: number;
  incomeBase: number;
  reimbursed: number;
  offsetTotal: number;
  totalBudget: number | null;
  categories: CatRollup[];
}

export function expenseOffsetUsed(
  transactions: Transaction[],
  expenseId: string,
  exceptIncomeId?: string,
): number {
  let sum = 0;
  for (const tx of transactions) {
    if (tx.type !== "income" || tx.id === exceptIncomeId) continue;
    for (const offset of tx.offsets) {
      if (offset.kind === "expense" && offset.expenseId === expenseId) sum += offset.amountBase;
    }
  }
  return sum;
}

export function accountCurrency(accounts: Account[], id: string | null): string {
  return accounts.find((a) => a.id === id)?.currency ?? BASE;
}

export function txBase(tx: Transaction, accounts: Account[], rates: Record<string, number>): number {
  return toBase(tx.amount, accountCurrency(accounts, tx.accountId), rates);
}

export function computeStats(data: LedgerData, period: Period, exceptIncomeId?: string): PeriodStats {
  const { categories, accounts, transactions, budgets, settings } = data;
  const grossBy = new Map<string, number>();
  const offsetBy = new Map<string, number>();
  let expenseGross = 0;
  let offsetTotal = 0;
  let incomeBase = 0;
  let reimbursed = 0;

  const touch = (map: Map<string, number>, id: string, amount: number) => {
    map.set(id, (map.get(id) ?? 0) + amount);
  };

  for (const tx of transactions) {
    if (!inPeriod(tx.date, period)) continue;
    const base = txBase(tx, accounts, settings.rates);
    if (tx.type === "income") {
      const offsetSum = tx.offsets.reduce((sum, offset) => sum + (offset.amountBase > 0 ? offset.amountBase : 0), 0);
      const back = Math.min(base, offsetSum);
      reimbursed += back;
      incomeBase += Math.max(0, base - back);
    }
    if (tx.type !== "expense" || !tx.includeInBudget) continue;
    expenseGross += base;
    touch(grossBy, tx.categoryId ?? "_none", base);
  }

  for (const tx of transactions) {
    if (tx.type !== "income" || !inPeriod(tx.date, period) || tx.id === exceptIncomeId) continue;
    for (const offset of tx.offsets) {
      const amount = offset.amountBase;
      if (!(amount > 0)) continue;
      offsetTotal += amount;
      if (offset.kind === "expense" && offset.expenseId) {
        const expense = transactions.find((t) => t.id === offset.expenseId);
        touch(offsetBy, expense?.categoryId ?? "_none", amount);
      } else if (offset.kind === "category" && offset.categoryId) {
        touch(offsetBy, offset.categoryId, amount);
      }
    }
  }

  const ids = new Set<string>([...grossBy.keys(), ...offsetBy.keys()]);
  for (const id of Object.keys(budgets)) {
    if (id !== "total") ids.add(id);
  }

  const rollups: CatRollup[] = [...ids]
    .filter((id) => id !== "_none")
    .map((id) => {
      const gross = grossBy.get(id) ?? 0;
      const offset = offsetBy.get(id) ?? 0;
      return {
        id,
        name: categoryPath(categories, id),
        gross,
        offset,
        net: gross - offset,
        budget: budgets[id] ?? null,
      };
    })
    .sort((a, b) => b.net - a.net);

  const uncategorizedGross = grossBy.get("_none") ?? 0;
  const uncategorizedOffset = offsetBy.get("_none") ?? 0;
  if (uncategorizedGross || uncategorizedOffset) {
    rollups.push({
      id: "_none",
      name: "未分類",
      gross: uncategorizedGross,
      offset: uncategorizedOffset,
      net: uncategorizedGross - uncategorizedOffset,
      budget: null,
    });
  }

  return {
    expenseGross,
    expenseNet: expenseGross - offsetTotal,
    incomeBase,
    reimbursed,
    offsetTotal,
    totalBudget: budgets.total ?? null,
    categories: rollups,
  };
}

export function accountBalance(data: LedgerData, accountId: string): number {
  let sum = 0;
  for (const tx of data.transactions) {
    if (tx.type === "expense" && tx.accountId === accountId) sum -= tx.amount;
    if (tx.type === "income" && tx.accountId === accountId) sum += tx.amount;
    if (tx.type === "transfer") {
      if (tx.accountId === accountId) sum -= tx.amount;
      if (tx.toAccountId === accountId) {
        const fromCur = accountCurrency(data.accounts, tx.accountId);
        const toCur = accountCurrency(data.accounts, tx.toAccountId);
        if (fromCur === toCur) sum += tx.amount;
        else {
          const base = toBase(tx.amount, fromCur, data.settings.rates);
          const rate = data.settings.rates[toCur] || 1;
          sum += base / rate;
        }
      }
    }
  }
  return sum;
}

export function evaluateAmount(input: string): number | null {
  const s = input.replace(/×/g, "*").replace(/÷/g, "/").replace(/\s/g, "");
  if (!s || !/^[\d.+\-*/()]+$/.test(s)) return null;
  try {
    let i = 0;
    const peek = () => s[i];
    const parseExpr = (): number => {
      let left = parseTerm();
      while (peek() === "+" || peek() === "-") {
        const op = s[i++];
        const right = parseTerm();
        left = op === "+" ? left + right : left - right;
      }
      return left;
    };
    const parseTerm = (): number => {
      let left = parseFactor();
      while (peek() === "*" || peek() === "/") {
        const op = s[i++];
        const right = parseFactor();
        if (op === "/" && right === 0) throw new Error("div0");
        left = op === "*" ? left * right : left / right;
      }
      return left;
    };
    const parseFactor = (): number => {
      if (peek() === "+") {
        i += 1;
        return parseFactor();
      }
      if (peek() === "-") {
        i += 1;
        return -parseFactor();
      }
      if (peek() === "(") {
        i += 1;
        const v = parseExpr();
        if (peek() !== ")") throw new Error("paren");
        i += 1;
        return v;
      }
      const start = i;
      while (i < s.length && /[\d.]/.test(s[i])) i += 1;
      if (start === i) throw new Error("num");
      const n = Number(s.slice(start, i));
      if (!Number.isFinite(n)) throw new Error("num");
      return n;
    };
    const value = parseExpr();
    if (i !== s.length || !Number.isFinite(value) || value < 0) return null;
    return value;
  } catch {
    return null;
  }
}

export function toCsv(data: LedgerData): string {
  const header = [
    "日期",
    "時間",
    "類型",
    "分類",
    "項目",
    "帳戶",
    "對方帳戶",
    "金額",
    "幣種",
    "約港幣",
    "計入預算",
    "備註",
    "沖銷",
  ];
  const typeName: Record<TxType, string> = { expense: "支出", income: "收入", transfer: "轉帳" };
  const lines = data.transactions
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .map((tx) => {
      const project = data.projects.find((p) => p.id === tx.projectId)?.name ?? "";
      const account = data.accounts.find((a) => a.id === tx.accountId);
      const other = data.accounts.find((a) => a.id === tx.toAccountId)?.name ?? "";
      const offsetText = tx.offsets
        .map((o) => {
          if (o.kind === "expense") {
            const exp = data.transactions.find((t) => t.id === o.expenseId);
            return `沖銷交易 ${exp ? formatShort(exp.date) : ""} ${formatMoney(o.amountBase)}`;
          }
          return `沖減 ${categoryPath(data.categories, o.categoryId ?? null)} ${formatMoney(o.amountBase)}`;
        })
        .join("；");
      const cells = [
        tx.date,
        tx.time,
        typeName[tx.type],
        categoryPath(data.categories, tx.categoryId),
        project,
        account?.name ?? "",
        other,
        String(tx.amount),
        account?.currency ?? BASE,
        txBase(tx, data.accounts, data.settings.rates).toFixed(2),
        tx.includeInBudget ? "是" : "否",
        tx.note,
        offsetText,
      ];
      return cells.map((c) => `"${c.replaceAll('"', '""')}"`).join(",");
    });
  return `\uFEFF${header.join(",")}\n${lines.join("\n")}`;
}

export function demoPatch(data: LedgerData): LedgerData {
  if (data.transactions.some((t) => t.id.startsWith("demo-"))) return data;
  const day = todayYmd();
  const expense: Transaction = {
    id: "demo-exp",
    type: "expense",
    date: day,
    time: "12:30",
    categoryId: "c-lunch",
    projectId: null,
    accountId: "a-card",
    toAccountId: null,
    includeInBudget: true,
    amount: 300,
    note: "幫同事買午餐",
    offsets: [],
  };
  const incomeA: Transaction = {
    id: "demo-in-a",
    type: "income",
    date: day,
    time: "13:05",
    categoryId: "c-reimb",
    projectId: null,
    accountId: "a-payme",
    toAccountId: null,
    includeInBudget: false,
    amount: 110,
    note: "同事 A 還款",
    offsets: [{ id: "demo-off-a", kind: "expense", expenseId: "demo-exp", amountBase: 110 }],
  };
  const incomeB: Transaction = {
    id: "demo-in-b",
    type: "income",
    date: day,
    time: "13:10",
    categoryId: "c-reimb",
    projectId: null,
    accountId: "a-payme",
    toAccountId: null,
    includeInBudget: false,
    amount: 110,
    note: "同事 B 還款",
    offsets: [{ id: "demo-off-b", kind: "expense", expenseId: "demo-exp", amountBase: 110 }],
  };
  return {
    ...data,
    transactions: [expense, incomeA, incomeB, ...data.transactions],
    budgets: { ...data.budgets, total: data.budgets.total ?? 8000, "c-lunch": data.budgets["c-lunch"] ?? 600 },
  };
}
