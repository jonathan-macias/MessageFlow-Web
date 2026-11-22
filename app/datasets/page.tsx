"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDatasets } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import type { DatasetListItem } from "@/lib/types/dataset";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { buttonClass } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { IconArrowRight, IconDatabase, IconUpload } from "@/components/ui/icons";

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
      .catch((err) => setError(err.detail ?? "Failed to load datasets."))
      .finally(() => setIsLoadingData(false));
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) return null;

  const uploadLink = (
    <Link href="/datasets/upload" className={buttonClass("primary")}>
      <IconUpload className="size-4" aria-hidden="true" />
      Upload dataset
    </Link>
  );

  return (
    <PageShell width="4xl">
      <PageHeader title="Datasets" actions={datasets.length > 0 ? uploadLink : undefined} />

      {error && <Alert tone="error">{error}</Alert>}

      {isLoadingData ? (
        <div role="status" aria-busy="true" className="flex items-center gap-2 text-sm text-muted">
          <Spinner />
          Loading...
        </div>
      ) : datasets.length === 0 ? (
        <EmptyState
          icon={<IconDatabase className="size-5" aria-hidden="true" />}
          title="No datasets yet."
          description="Upload an Excel or CSV file to start querying and messaging your contacts."
          action={uploadLink}
        />
      ) : (
        <ul className="space-y-2">
          {datasets.map((ds) => (
            <li key={ds.id}>
              <Card
                interactive
                className="flex cursor-pointer items-center justify-between gap-3"
                onClick={() => router.push(`/datasets/${ds.id}`)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <IconDatabase className="size-4" aria-hidden="true" />
                  </span>
                  <Link
                    href={`/datasets/${ds.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="truncate text-sm font-medium text-fg hover:text-accent"
                  >
                    {ds.name}
                  </Link>
                </div>
                <IconArrowRight className="size-4 shrink-0 text-subtle" aria-hidden="true" />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
