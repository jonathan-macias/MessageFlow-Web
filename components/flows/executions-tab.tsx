import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { ExecutionStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { Table, THead, Th, Tr, Td } from "@/components/ui/table";
import { ExecutionType, TriggerSource } from "@/lib/types/flow";
import type { FlowExecution, FlowExecutionDetail } from "@/lib/types/flow";

interface ExecutionsTabProps {
  executions: FlowExecution[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  detail: FlowExecutionDetail | null;
  isLoadingDetail: boolean;
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
}

function DetailItem({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-subtle">{label}</p>
      <div className={mono ? "break-all font-mono text-fg" : "text-fg"}>{children}</div>
    </div>
  );
}

export function ExecutionsTab({
  executions,
  selectedId,
  onSelect,
  detail,
  isLoadingDetail,
  page,
  totalPages,
  onPrevious,
  onNext,
}: ExecutionsTabProps) {
  if (executions.length === 0) {
    return <p className="text-sm text-muted">No executions yet.</p>;
  }

  return (
    <div className="space-y-4">
      <Table>
        <THead>
          <tr>
            <Th>Status</Th>
            <Th>Source</Th>
            <Th>Started</Th>
            <Th>Finished</Th>
            <Th>Records</Th>
            <Th>Successful</Th>
            <Th>Failed</Th>
          </tr>
        </THead>
        <tbody>
          {executions.map((ex) => {
            const selected = selectedId === ex.id;
            return (
              <Tr key={ex.id} interactive selected={selected} onClick={() => onSelect(selected ? null : ex.id)}>
                <Td>
                  {/* El clic burbujea a la fila (la alterna); el botón la hace accesible con teclado. */}
                  <button type="button" aria-expanded={selected} className="rounded-full">
                    <ExecutionStatusBadge status={ex.status} />
                  </button>
                </Td>
                <Td className="text-xs">{TriggerSource[ex.triggerSource] ?? ex.triggerSource}</Td>
                <Td className="text-xs">{new Date(ex.startedAtUtc).toLocaleString("en-US")}</Td>
                <Td className="text-xs">
                  {ex.completedAtUtc ? new Date(ex.completedAtUtc).toLocaleString("en-US") : "—"}
                </Td>
                <Td>
                  {ex.processedRecords}/{ex.totalRecords}
                </Td>
                <Td className="text-ok-fg">{ex.successfulRecords}</Td>
                <Td className="text-bad-fg">{ex.failedRecords}</Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>

      {selectedId && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg">Execution details</h3>
            <Button variant="ghost" size="sm" onClick={() => onSelect(null)}>
              Close
            </Button>
          </div>
          {isLoadingDetail ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : detail ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <DetailItem label="ID" mono>
                  {detail.id}
                </DetailItem>
                <DetailItem label="Idempotency Key" mono>
                  {detail.idempotencyKey}
                </DetailItem>
                <DetailItem label="Type">{ExecutionType[detail.executionType] ?? detail.executionType}</DetailItem>
                <DetailItem label="Status">
                  <ExecutionStatusBadge status={detail.status} />
                </DetailItem>
                <DetailItem label="Source">{TriggerSource[detail.triggerSource] ?? detail.triggerSource}</DetailItem>
                <DetailItem label="Started">{new Date(detail.startedAtUtc).toLocaleString("en-US")}</DetailItem>
                <DetailItem label="Finished">
                  {detail.completedAtUtc ? new Date(detail.completedAtUtc).toLocaleString("en-US") : "—"}
                </DetailItem>
                <DetailItem label="Records">
                  {detail.processedRecords}/{detail.totalRecords} ({detail.successfulRecords} ok,{" "}
                  {detail.failedRecords} failed)
                </DetailItem>
              </div>
              {detail.errorMessage && (
                <Alert tone="error" title="Error:" className="text-xs">
                  <p className="font-mono">{detail.errorMessage}</p>
                </Alert>
              )}
            </div>
          ) : (
            <p className="text-sm text-bad-fg">Could not load the details.</p>
          )}
        </Card>
      )}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPrevious={onPrevious} onNext={onNext} />}
    </div>
  );
}
