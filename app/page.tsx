"use client";

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
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Message Flow</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Hola, {user?.email}
        </p>
        <button
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}
