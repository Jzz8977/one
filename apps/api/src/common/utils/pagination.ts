export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function pageOf(query: { page?: number | string; pageSize?: number | string }): PageParams {
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 20)));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function pageResult<T>(items: T[], total: number, params: PageParams) {
  return { items, total, page: params.page, pageSize: params.pageSize };
}
