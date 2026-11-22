"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getFlows } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import type { FlowListItem } from "@/lib/types/flow";
import { ExecutionType, ChannelType } from "@/lib/types/flow";
import { Alert } from "@/components/ui/alert";
import { FlowStatusBadge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconFlow, IconPlus } from "@/components/ui/icons";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { Pagination } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";

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
      .catch((err) => { if (!cancelled) setError(err.detail ?? "Failed to load flows."); })
      .finally(() => { if (!cancelled) setIsLoadingData(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated, page]);

  if (isLoading || !isAuthenticated) return null;

  return (
    <PageShell width="4xl">
      <PageHeader
        title="Flows"
        actions={
          <Link href="/flows/new" className={buttonClass("primary")}>
            <IconPlus className="size-4" />
            Create flow
          </Link>
        }
      />

      {error && <Alert tone="error">{error}</Alert>}

      {isLoadingData ? (
        <div role="status" className="flex items-center gap-2 text-sm text-muted">
          <Spinner />
          Loading...
        </div>
      ) : flows.length === 0 ? (
        <EmptyState
          icon={<IconFlow className="size-5" />}
          title="No flows yet."
          description="Create a flow to send automated messages to the contacts in a dataset."
        />
      ) : (
        <>
          <Table>
            <THead>
              <tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Channel</Th>
                <Th>Execution</Th>
                <Th>Created</Th>
              </tr>
            </THead>
            <tbody>
              {flows.map((flow) => (
                <Tr key={flow.id} interactive onClick={() => router.push(`/flows/${flow.id}`)}>
                  <Td className="font-medium">
                    <Link
                      href={`/flows/${flow.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded text-fg hover:text-accent hover:underline"
                    >
                      {flow.name}
                    </Link>
                  </Td>
                  <Td>
                    <FlowStatusBadge status={flow.status} />
                  </Td>
                  <Td>{ChannelType[flow.channel] ?? flow.channel}</Td>
                  <Td>{ExecutionType[flow.executionType] ?? flow.executionType}</Td>
                  <Td className="text-muted">{new Date(flow.createdAtUtc).toLocaleDateString("en-US")}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              summary={`${totalCount} total`}
              onPrevious={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
            />
          )}
        </>
      )}
    </PageShell>
  );
}
