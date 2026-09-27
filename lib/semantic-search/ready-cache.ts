const STORAGE_PREFIX = "semantic-search-ready:";

/**
 * remembering that a dataset finished indexing only avoids showing the preparation
 * notice again in the same session. The server stays the source of truth: a 409 can
 * still arrive, and when it does we show the notice regardless of this cache.
 */
export function isDatasetReady(datasetId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(`${STORAGE_PREFIX}${datasetId}`) === "true";
  } catch {
    return false;
  }
}

export function markDatasetReady(datasetId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${datasetId}`, "true");
  } catch {
    // storage unavailable (private mode, quota): the cache is only an optimization
  }
}
