import "server-only";

/**
 * Reads every row of a query, page by page.
 *
 * PostgREST applies a server-side row cap (1,000 by default) to any select
 * without an explicit range. That cap is silent: the request succeeds and
 * simply returns fewer rows than exist. With the client's ~1,500-bike master
 * imported, an unbounded read made 500+ bikes invisible in the UI and skewed
 * every dashboard total, with nothing in the logs to show for it.
 *
 * Pass a factory that applies `.range(from, to)` to the query being paged.
 */
export const PAGE_SIZE = 1000;

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  { pageSize = PAGE_SIZE, maxRows = 100_000 }: { pageSize?: number; maxRows?: number } = {}
): Promise<T[]> {
  const all: T[] = [];

  for (let from = 0; from < maxRows; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    all.push(...rows);
    // A short page means there is nothing after it.
    if (rows.length < pageSize) break;
  }

  return all;
}
