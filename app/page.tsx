"use client";

import Link from "next/link";
import { useAuth } from "@/lib/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
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
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-4xl mx-auto py-10 px-4 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Hello, {user?.email?.split("@")[0]}</h1>
          <p className="text-zinc-500 text-sm mt-1">Welcome to Message Flow</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/datasets"
            className="group rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
          >
            <div className="text-2xl mb-2"> Datasets</div>
            <h2 className="font-semibold group-hover:underline">Manage datasets</h2>
            <p className="text-sm text-zinc-500 mt-1">Upload, view and manage your datasets.</p>
          </Link>

          <Link
            href="/flows"
            className="group rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
          >
            <div className="text-2xl mb-2">⚡</div>
            <h2 className="font-semibold group-hover:underline">Manage flows</h2>
            <p className="text-sm text-zinc-500 mt-1">Create, configure and run messaging flows.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
