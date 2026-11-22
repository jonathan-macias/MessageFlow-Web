"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDataset, getDatasetRows, getDatasetColumns } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import type { DatasetDetail, DatasetColumn, PaginatedRows } from "@/lib/types/dataset";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function DatasetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [dataset, setDataset] = useState<DatasetDetail | null>(null);
  const [columns, setColumns] = useState<DatasetColumn[]>([]);
  const [rowsData, setRowsData] = useState<PaginatedRows | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    Promise.all([getDataset(id), getDatasetColumns(id)])
      .then(([ds, cols]) => {
        setDataset(ds);
        setColumns(cols);
      })
      .catch((err) => setError(err.detail ?? "Failed to load the dataset."))
      .finally(() => setIsLoadingData(false));
  }, [isAuthenticated, id]);

  useEffect(() => {
    if (!isAuthenticated || !id) return;
    getDatasetRows(id, page, 20)
      .then(setRowsData)
      .catch((err) => setError(err.detail ?? "Failed to load rows."));
  }, [isAuthenticated, id, page]);

  if (isLoading || !isAuthenticated) return null;

  const columnNames = columns.map((c) => c.name);

  return (
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-5xl mx-auto py-10 px-4 space-y-6">
        <Breadcrumbs items={[
          { label: "Datasets", href: "/datasets" },
          { label: isLoadingData ? "..." : dataset?.name ?? "..." },
        ]} />
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {isLoadingData ? "Loading..." : dataset?.name}
          </h1>
          {dataset && (
            <div className="flex items-center gap-2">
              <Link
                href={`/datasets/${id}/query`}
                className="rounded-full bg-blue-600 text-white px-3 py-1 text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                Ask AI
              </Link>
              <Link
                href={`/datasets/${id}/semantic-search`}
                className="rounded-full border border-black/10 dark:border-white/10 px-3 py-1 text-xs font-medium hover:bg-black/[.04] dark:hover:bg-white/[.06] transition-colors"
              >
                Semantic search
              </Link>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2">
            {error}
          </p>
        )}

        {dataset && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3">
              <p className="text-zinc-500">File</p>
              <p className="font-medium">{dataset.sourceFileName}</p>
            </div>
            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3">
              <p className="text-zinc-500">Rows</p>
              <p className="font-medium">{dataset.rowCount}</p>
            </div>
            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3">
              <p className="text-zinc-500">Phone column</p>
              <p className="font-medium">{dataset.phoneColumn}</p>
            </div>
            <div className="rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 p-3">
              <p className="text-zinc-500">Created</p>
              <p className="font-medium">
                {new Date(dataset.createdAtUtc).toLocaleDateString("en-US")}
              </p>
            </div>
          </div>
        )}

        {columns.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Columns</h2>
            <div className="flex flex-wrap gap-2">
              {columns.map((col) => (
                <span
                  key={col.id}
                  className="rounded bg-zinc-200 dark:bg-zinc-800 px-2 py-1 text-xs font-mono"
                >
                  {col.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {rowsData && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              Records ({rowsData.totalCount})
            </h2>
            <div className="overflow-x-auto rounded border border-black/10 dark:border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-800">
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    {columnNames.map((name) => (
                      <th key={name} className="px-3 py-2 text-left font-medium">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsData.items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-black/5 dark:border-white/5"
                    >
                      <td className="px-3 py-2 text-zinc-500">{row.rowNumber}</td>
                      {columnNames.map((name) => (
                        <td key={name} className="px-3 py-2">
                          {row.values[name] ?? (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {rowsData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded border border-black/10 dark:border-white/10 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-zinc-500">
                  Page {rowsData.page} of {rowsData.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(rowsData.totalPages, p + 1))}
                  disabled={page === rowsData.totalPages}
                  className="rounded border border-black/10 dark:border-white/10 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
