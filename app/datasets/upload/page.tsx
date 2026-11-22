"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadDataset } from "@/lib/api";
import { useAuth } from "@/lib/context/auth-context";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function UploadDatasetPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="flex flex-1 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-lg mx-auto py-10 px-4 space-y-6">
        <Breadcrumbs items={[
          { label: "Datasets", href: "/datasets" },
          { label: "Upload dataset" },
        ]} />
        <h1 className="text-2xl font-bold">Upload dataset</h1>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded p-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="file" className="block text-sm font-medium mb-1">
              File (Excel)
            </label>
            <input
              ref={fileInputRef}
              id="file"
              type="file"
              accept=".xlsx,.xls,.csv"
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-foreground file:text-background file:px-3 file:py-1 file:text-sm file:font-medium"
            />
          </div>
          <div>
            <label htmlFor="ds-name" className="block text-sm font-medium mb-1">
              Dataset name
            </label>
            <input
              id="ds-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <div>
            <label htmlFor="phone-col" className="block text-sm font-medium mb-1">
              Phone column
            </label>
            <input
              id="phone-col"
              type="text"
              required
              value={phoneColumn}
              onChange={(e) => setPhoneColumn(e.target.value)}
              placeholder="Exact column name"
              className="w-full rounded border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded bg-foreground py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Uploading..." : "Upload dataset"}
          </button>
        </form>
      </div>
    </div>
  );
}
