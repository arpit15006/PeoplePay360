export interface BulkOutcome<T> {
  succeeded: T[];
  failed: { item: T; label: string; message: string }[];
}

/**
 * Runs one action over many rows and reports what happened to each.
 *
 * Sequential on purpose. These actions hit endpoints that read a balance and
 * write it back — approving leave deducts from an allocation — so firing them
 * together would race on the same row. Sequential also keeps the server-side
 * guards meaningful: a bulk approve that includes the approver's own request is
 * refused for that row alone, and the rest still go through, rather than the
 * whole batch failing or, worse, the guard being bypassed.
 */
export async function runBulk<T>(
  items: T[],
  label: (item: T) => string,
  action: (item: T) => Promise<unknown>
): Promise<BulkOutcome<T>> {
  const succeeded: T[] = [];
  const failed: BulkOutcome<T>['failed'] = [];

  for (const item of items) {
    try {
      await action(item);
      succeeded.push(item);
    } catch (err) {
      failed.push({
        item,
        label: label(item),
        message: err instanceof Error ? err.message : 'Something went wrong',
      });
    }
  }

  return { succeeded, failed };
}
