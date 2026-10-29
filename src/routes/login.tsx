import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="grid min-h-screen place-items-center bg-bg px-6 text-fg">
      <div className="w-full max-w-sm">
        <p className="text-sm text-muted">清帳</p>
        <h1 className="mt-1 text-2xl font-semibold">登入帳本</h1>
        <p className="mt-2 text-sm text-muted">用同一個帳戶登入，就可以在其他裝置打開這本帳。</p>
        <div className="mt-6 flex flex-col gap-2">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
                className="min-h-11 rounded-lg border border-line bg-surface px-4"
              >
                用 {p.label} 繼續
              </button>
            ))
          ) : (
            <p className="text-sm text-muted">登入尚未開啟。</p>
          )}
        </div>
        <Link to="/" className="mt-6 inline-flex min-h-11 items-center text-sm text-primary">
          先在這部裝置記帳
        </Link>
      </div>
    </main>
  );
}
