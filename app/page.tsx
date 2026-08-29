"use client";

import Link from "next/link";
import { useAuth } from "@/lib/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="text-center space-y-6">
        <h1 className="text-2xl font-bold">Message Flow</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Hola, {user?.email}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/datasets"
            className="rounded bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Datasets
          </Link>
          <Link
            href="/flows"
            className="rounded border border-black/10 dark:border-white/10 px-5 py-2 text-sm font-medium hover:bg-black/[.04] dark:hover:bg-[#1a1a1a]"
          >
            Flows
          </Link>
        </div>

        <button
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="text-sm text-zinc-500 hover:underline"
        >
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}
