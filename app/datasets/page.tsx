"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDatasets } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import type { DatasetListItem } from "@/lib/types/dataset";

export default function DatasetsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [datasets, setDatasets] = useState<DatasetListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getDatasets()
      .then(setDatasets)
      .catch((err) => setError(err.detail ?? "Error al cargar datasets."))
      .finally(() => setIsLoadingData(false));
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-4xl mx-auto py-10 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Datasets</h1>
          <Link
            href="/datasets/upload"
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Subir dataset
          </Link>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2">
            {error}
          </p>
        )}

        {isLoadingData ? (
          <p className="text-zinc-500">Cargando...</p>
        ) : datasets.length === 0 ? (
          <p className="text-zinc-500">No hay datasets.</p>
        ) : (
          <div className="space-y-2">
            {datasets.map((ds) => (
              <Link
                key={ds.id}
                href={`/datasets/${ds.id}`}
                className="block rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
              >
                <span className="font-medium">{ds.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
