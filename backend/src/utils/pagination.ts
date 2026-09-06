/**
 * Server-side paging for the lists that grow without bound.
 *
 * Most lists here grow with headcount and stay small enough to send whole. Two
 * do not: attendance and payslips grow with headcount *times* time, so a
 * thousand employees produce twenty-odd thousand attendance rows a month. That
 * was being sent in full and paged in the browser, which meant every visit
 * downloaded megabytes to show twenty-five rows.
 *
 * Paging is opt-in so an existing caller that asks for no page still works, but
 * a cap always applies — an unbounded query is never the right answer, and
 * silently truncating one is worse, so the response says when there is more.
 */

/** What a caller gets without asking, and the most it may ask for. */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 200;
/** The ceiling for a caller that asks for no page at all. */
export const UNPAGED_CAP = 500;

export interface PageParams {
  page?: string | number;
  pageSize?: string | number;
}

export interface PageQuery {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
  /** True when the caller named a page, rather than taking the capped default. */
  explicit: boolean;
}

export interface Paged<T> {
  data: T[];
  count: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** Set when an unpaged caller hit the cap, so the gap is never silent. */
  truncated?: boolean;
}

const toInt = (value: string | number | undefined): number | undefined => {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? Math.floor(n) : undefined;
};

export function pageQuery(params: PageParams): PageQuery {
  const rawPage = toInt(params.page);
  const rawSize = toInt(params.pageSize);
  const explicit = rawPage !== undefined || rawSize !== undefined;

  const page = Math.max(1, rawPage ?? 1);
  const pageSize = explicit
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize ?? DEFAULT_PAGE_SIZE))
    : UNPAGED_CAP;

  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize, explicit };
}

export function paged<T>(rows: T[], total: number, q: PageQuery): Paged<T> {
  return {
    data: rows,
    count: rows.length,
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    ...(!q.explicit && total > rows.length ? { truncated: true } : {}),
  };
}
