export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  content: T;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
