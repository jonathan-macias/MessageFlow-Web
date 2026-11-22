"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { login, loginWithGoogle } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import { AuthShell } from "@/components/auth-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

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
        // El botón es un iframe de Google: solo se controlan estas opciones. El ancho debe ser un
        // número de píxeles (200–400), así que se mide el contenedor; el tema sigue al de la app.
        const isDark = document.documentElement.classList.contains("dark");
        const width = Math.min(400, Math.max(200, Math.round(googleBtnRef.current.clientWidth) || 320));
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: isDark ? "filled_black" : "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          locale: "en",
          width,
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
    <AuthShell
      title="Sign in"
      subtitle="Welcome back to MessageFlow."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-accent underline-offset-4 hover:underline">
            Sign up
          </Link>
        </>
      }
    >
      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {showGoogle && (
        <>
          <div className="flex items-center gap-3 text-xs text-subtle">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
          <div ref={googleBtnRef} className="flex w-full justify-center" />
        </>
      )}
    </AuthShell>
  );
}
