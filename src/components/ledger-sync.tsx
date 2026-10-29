import { useEffect, useRef, useState } from "react";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { loadLedger, saveLedger } from "@/lib/ledger/remote";
import type { LedgerData } from "@/lib/ledger/model";
import { useLedger, type LedgerStore } from "@/lib/ledger/store";

export type SyncState = "off" | "signed-out" | "syncing" | "saved" | "error";

function pick(state: LedgerStore): LedgerData {
  return {
    categories: state.categories,
    projects: state.projects,
    accounts: state.accounts,
    transactions: state.transactions,
    budgets: state.budgets,
    settings: state.settings,
  };
}

export function useLedgerSync() {
  const { user, isPending } = useCurrentUserState();
  const [status, setStatus] = useState<SyncState>(authEnabled ? "signed-out" : "off");
  const pushing = useRef(false);
  const userId = user?.id ?? null;

  useEffect(() => {
    void useLedger.persist.rehydrate();
  }, []);

  useEffect(() => {
    if (!authEnabled) return;
    if (isPending) return;
    if (!userId) {
      setStatus("signed-out");
      return;
    }
    let cancel = false;
    pushing.current = true;
    setStatus("syncing");
    const before = JSON.stringify(pick(useLedger.getState()));
    void (async () => {
      try {
        await useLedger.persist.rehydrate();
        const remote = await loadLedger();
        if (cancel) return;
        const after = JSON.stringify(pick(useLedger.getState()));
        if (remote?.data && before === after) {
          useLedger.getState().replaceData(remote.data);
        } else {
          await saveLedger({ data: { data: pick(useLedger.getState()) } });
        }
        if (!cancel) setStatus("saved");
      } catch {
        if (!cancel) setStatus("error");
      } finally {
        pushing.current = false;
      }
    })();
    return () => {
      cancel = true;
    };
  }, [userId, isPending]);

  useEffect(() => {
    if (!authEnabled || !userId) return;
    let timer = 0;
    const unsub = useLedger.subscribe((state) => {
      if (pushing.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setStatus("syncing");
        void saveLedger({ data: { data: pick(state) } })
          .then(() => setStatus("saved"))
          .catch(() => setStatus("error"));
      }, 700);
    });
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, [userId]);

  return status;
}
