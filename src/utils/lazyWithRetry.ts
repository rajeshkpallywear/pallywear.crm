import React, { ComponentType, lazy, LazyExoticComponent } from 'react';

/**
 * Wraps dynamic component imports with automatic retry & reload logic.
 * Solves the common SPA issue where newly deployed builds change chunk hashes,
 * causing stale cached clients to fail fetching the old chunk ('Failed to fetch dynamically imported module').
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    const sessionKey = 'lazy_chunk_retry_timestamp';
    const lastRetry = sessionStorage.getItem(sessionKey);
    const now = Date.now();

    try {
      const component = await componentImport();
      // On successful import, clear the retry flag
      sessionStorage.removeItem(sessionKey);
      return component;
    } catch (error: any) {
      console.error('Dynamic module import failed:', error);

      const isChunkError =
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('error loading dynamically imported module') ||
        error?.name === 'ChunkLoadError';

      // Check if we already reloaded within the last 15 seconds to prevent infinite reload loop
      const hasRecentRetry = lastRetry && now - parseInt(lastRetry, 10) < 15000;

      if (isChunkError && !hasRecentRetry) {
        console.warn('Chunk mismatch detected. Auto-reloading to fetch newest deployment...');
        sessionStorage.setItem(sessionKey, now.toString());
        // Reload page to fetch the latest index.html and chunk manifests
        window.location.reload();
        // Return a dummy placeholder while the reload happens
        return { default: (() => null) as unknown as T };
      }

      // If already retried or it's a different error, pass through to ErrorBoundary
      throw error;
    }
  });
}
