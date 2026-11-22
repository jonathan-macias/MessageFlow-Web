"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { login, loginWithGoogle } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { setUser, isAuthenticated } = useAuth();
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === "TU_GOOGLE_CLIENT_ID_AQUI") return;

    const resolvedClientId = clientId;

    function onGoogleLoad() {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: resolvedClientId,
        callback: async (response) => {
          try {
            setError(null);
            const auth = await loginWithGoogle({ idToken: response.credential });
            setUser(auth);
            router.replace("/");
          } catch (err) {
            const e = err as { detail?: string };
            setError(e.detail ?? "Failed to sign in with Google.");
          }
        },
      });
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "outline",
          size: "large",
          width: "100%",
        });
      }
    }

    if (window.google) {
      onGoogleLoad();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = onGoogleLoad;
    document.head.appendChild(script);
    return () => {
      script.onload = null;
    };
  }, [router, setUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const auth = await login({ email, password });
      setUser(auth);
      router.replace("/");
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Incorrect email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const showGoogle =
    googleClientId && googleClientId !== "TU_GOOGLE_CLIENT_ID_AQUI";

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">Sign in</h1>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-foreground py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {showGoogle && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-black/10 dark:border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-zinc-50 dark:bg-black px-2 text-zinc-500">
                  or
                </span>
              </div>
            </div>
            <div ref={googleBtnRef} className="flex justify-center" />
          </>
        )}

        <p className="text-center text-sm text-zinc-500">
          Don&apos;t have an account?{" "}
          <a href="/register" className="font-medium text-foreground underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
