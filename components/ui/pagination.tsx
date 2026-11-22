import { cn } from "@/lib/cn";
import { Button } from "./button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  /** Texto adicional (por ejemplo "120 records"). */
  summary?: string;
  disabled?: boolean;
  className?: string;
}

export function Pagination({ page, totalPages, onPrevious, onNext, summary, disabled, className }: PaginationProps) {
  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-between gap-3 text-sm", className)}>
      <Button variant="secondary" size="sm" onClick={onPrevious} disabled={disabled || page <= 1}>
        Previous
      </Button>
      <span className="text-muted tabular-nums">
        Page {page} of {Math.max(totalPages, 1)}
        {summary && <span className="text-subtle"> · {summary}</span>}
      </span>
      <Button variant="secondary" size="sm" onClick={onNext} disabled={disabled || page >= totalPages}>
        Next
      </Button>
    </nav>
  );
}
