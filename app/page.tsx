"use client";

import Link from "next/link";
import { useAuth } from "@/lib/context/auth-context";
import { getDatasets, getFlows } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { IconArrowRight, IconDatabase, IconFlow, IconPlus, IconUpload } from "@/components/ui/icons";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { Skeleton } from "@/components/ui/spinner";

interface Counts {
  datasets: number | null;
  flows: number | null;
}

interface SummaryCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
  /** null = no disponible (la tarjeta se muestra sin número). */
  count: number | null;
  loading: boolean;
  singular: string;
  plural: string;
  actions: ReactNode;
}

function SummaryCard({ icon, title, description, href, count, loading, singular, plural, actions }: SummaryCardProps) {
  return (
    <Card interactive className="group relative flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">{icon}</div>
        <div className="text-right" aria-live="polite">
          {loading ? (
            <Skeleton className="ml-auto h-7 w-10" />
          ) : count !== null ? (
            <>
              <p className="text-2xl font-semibold tabular-nums leading-none text-fg">{count}</p>
              <p className="mt-1 text-xs text-subtle">{count === 1 ? singular : plural}</p>
            </>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="font-semibold text-fg">
          {/* Enlace extendido: toda la tarjeta navega; las acciones van por encima (relative z-10). */}
          <Link href={href} className="rounded after:absolute after:inset-0 after:rounded-xl">
            {title}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>

      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-2 pt-1">{actions}</div>
    </Card>
  );
}

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [counts, setCounts] = useState<Counts>({ datasets: null, flows: null });
  const [countsLoading, setCountsLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  // Conteos con los endpoints existentes. Si alguno falla, la tarjeta se muestra sin número.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    Promise.allSettled([getDatasets(), getFlows(1, 1)]).then(([datasets, flows]) => {
      if (cancelled) return;
      setCounts({
        datasets: datasets.status === "fulfilled" ? datasets.value.length : null,
        flows: flows.status === "fulfilled" ? flows.value.totalCount : null,
      });
      setCountsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <PageShell className="py-10 space-y-8">
      <PageHeader
        title={`Hello, ${user?.email?.split("@")[0]}`}
        description="Manage your datasets and automated messaging flows."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          icon={<IconDatabase className="size-5" />}
          title="Manage datasets"
          description="Upload contact spreadsheets, browse their records and ask questions with AI."
          href="/datasets"
          count={counts.datasets}
          loading={countsLoading}
          singular="dataset"
          plural="datasets"
          actions={
            <>
              <Link href="/datasets" className={buttonClass("secondary", "sm")}>
                View datasets
                <IconArrowRight className="size-3.5" />
              </Link>
              <Link href="/datasets/upload" className={buttonClass("ghost", "sm")}>
                <IconUpload className="size-3.5" />
                Upload dataset
              </Link>
            </>
          }
        />

        <SummaryCard
          icon={<IconFlow className="size-5" />}
          title="Manage flows"
          description="Create, schedule and run WhatsApp messaging flows for your contacts."
          href="/flows"
          count={counts.flows}
          loading={countsLoading}
          singular="flow"
          plural="flows"
          actions={
            <>
              <Link href="/flows" className={buttonClass("secondary", "sm")}>
                View flows
                <IconArrowRight className="size-3.5" />
              </Link>
              <Link href="/flows/new" className={buttonClass("ghost", "sm")}>
                <IconPlus className="size-3.5" />
                New flow
              </Link>
            </>
          }
        />
      </div>
    </PageShell>
  );
}
