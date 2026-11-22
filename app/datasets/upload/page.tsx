"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDataset } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function UploadDatasetPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [phoneColumn, setPhoneColumn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Select a file.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await uploadDataset(file, name, phoneColumn);
      router.push(`/datasets/${result.id}`);
    } catch (err) {
      const e = err as { detail?: string };
      setError(e.detail ?? "Failed to upload the dataset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell width="lg">
      <div>
        <Breadcrumbs items={[
          { label: "Datasets", href: "/datasets" },
          { label: "Upload dataset" },
        ]} />
        <PageHeader title="Upload dataset" />
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="File (Excel)" hint="Accepted format: .xlsx (Excel)">
          <Input
            type="file"
            accept=".xlsx"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="cursor-pointer p-1.5 text-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-on-accent hover:file:bg-accent-hover"
          />
        </Field>
        <Field label="Dataset name">
          <Input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Phone column">
          <Input
            type="text"
            required
            value={phoneColumn}
            onChange={(e) => setPhoneColumn(e.target.value)}
            placeholder="Exact column name"
          />
        </Field>
        <Button type="submit" loading={isSubmitting} className="w-full">
          {isSubmitting ? "Uploading..." : "Upload dataset"}
        </Button>
      </form>
    </PageShell>
  );
}
