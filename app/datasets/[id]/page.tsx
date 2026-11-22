"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getDataset, getDatasetRows, getDatasetColumns } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import type { DatasetDetail, DatasetColumn, PaginatedRows } from "@/lib/types/dataset";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { SectionTitle, StatCard } from "@/components/ui/card";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { IconSearch, IconSparkles } from "@/components/ui/icons";

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
    <PageShell width="5xl">
      <div>
        <Breadcrumbs items={[
          { label: "Datasets", href: "/datasets" },
          { label: isLoadingData ? "..." : dataset?.name ?? "..." },
        ]} />
        <PageHeader
          title={isLoadingData ? "Loading..." : dataset?.name}
          actions={
            dataset && (
              <>
                <Link href={`/datasets/${id}/query`} className={buttonClass("primary", "sm")}>
                  <IconSparkles className="size-3.5" aria-hidden="true" />
                  Ask AI
                </Link>
                <Link href={`/datasets/${id}/semantic-search`} className={buttonClass("secondary", "sm")}>
                  <IconSearch className="size-3.5" aria-hidden="true" />
                  Semantic search
                </Link>
              </>
            )
          }
        />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {dataset && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <StatCard label="File" value={<span className="break-words text-sm font-medium">{dataset.sourceFileName}</span>} />
          <StatCard label="Rows" value={dataset.rowCount} />
          <StatCard label="Phone column" value={<span className="break-words text-sm font-medium">{dataset.phoneColumn}</span>} />
          <StatCard
            label="Created"
            value={new Date(dataset.createdAtUtc).toLocaleDateString("en-US")}
          />
        </div>
      )}

      {columns.length > 0 && (
        <section aria-labelledby="columns-heading" className="space-y-2">
          <SectionTitle id="columns-heading">Columns</SectionTitle>
          <ul className="flex flex-wrap gap-2">
            {columns.map((col) => (
              <li
                key={col.id}
                className="rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-xs text-fg"
              >
                {col.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {rowsData && (
        <section aria-labelledby="records-heading" className="space-y-3">
          <SectionTitle id="records-heading">Records ({rowsData.totalCount})</SectionTitle>
          <Table>
            <THead>
              <tr>
                <Th>#</Th>
                {columnNames.map((name) => (
                  <Th key={name}>{name}</Th>
                ))}
              </tr>
            </THead>
            <tbody>
              {rowsData.items.map((row) => (
                <Tr key={row.id}>
                  <Td className="text-subtle tabular-nums">{row.rowNumber}</Td>
                  {columnNames.map((name) => (
                    <Td key={name}>
                      {row.values[name] ?? <span className="text-subtle">—</span>}
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </Table>

          {rowsData.totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={rowsData.totalPages}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(rowsData.totalPages, p + 1))}
            />
          )}
        </section>
      )}
    </PageShell>
  );
}
