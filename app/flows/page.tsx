"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFlows } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import type { FlowListItem } from "@/lib/types/flow";
import { ExecutionType, ChannelType, FlowStatus } from "@/lib/types/flow";

export default function FlowsPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [flows, setFlows] = useState<FlowListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    getFlows(page, 20)
      .then((data) => {
        if (cancelled) return;
        setFlows(data.items);
        setTotalPages(data.totalPages);
        setTotalCount(data.totalCount);
      })
      .catch((err) => { if (!cancelled) setError(err.detail ?? "Error al cargar flujos."); })
      .finally(() => { if (!cancelled) setIsLoadingData(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated, page]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-4xl mx-auto py-10 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Flows</h1>
          <Link
            href="/flows/new"
            className="rounded bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            Crear flow
          </Link>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2">
            {error}
          </p>
        )}

        {isLoadingData ? (
          <p className="text-zinc-500">Cargando...</p>
        ) : flows.length === 0 ? (
          <p className="text-zinc-500">No hay flows.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-800">
                    <th className="px-4 py-3 text-left font-medium">Nombre</th>
                    <th className="px-4 py-3 text-left font-medium">Estado</th>
                    <th className="px-4 py-3 text-left font-medium">Canal</th>
                    <th className="px-4 py-3 text-left font-medium">Ejecucion</th>
                    <th className="px-4 py-3 text-left font-medium">Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {flows.map((flow) => (
                    <tr
                      key={flow.id}
                      className="border-t border-black/5 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer"
                      onClick={() => router.push(`/flows/${flow.id}`)}
                    >
                      <td className="px-4 py-3 font-medium">{flow.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                          flow.status === 2 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : flow.status === 3 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : flow.status === 4 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}>
                          {FlowStatus[flow.status] ?? flow.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {ChannelType[flow.channel] ?? flow.channel}
                      </td>
                      <td className="px-4 py-3">
                        {ExecutionType[flow.executionType] ?? flow.executionType}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(flow.createdAtUtc).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border border-black/10 dark:border-white/10 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-sm text-zinc-500">
                  Pagina {page} de {totalPages} ({totalCount} total)
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded border border-black/10 dark:border-white/10 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
