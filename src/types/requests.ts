// types/requests.ts
export interface DateRangeQuery {
  period?: string;
  startDate?: string;
  endDate?: string;
}

export interface SalesDataQuery extends DateRangeQuery {
  year?: string;
}

export interface MonthlySalesQuery extends DateRangeQuery {
  year?: string;
  month?: string;
}

export interface WeeklySalesQuery extends DateRangeQuery {
  year?: string;
  week?: string;
}

export interface DashboardQuery extends DateRangeQuery {
  lowStockThreshold?: string;
  listLimits?: string;
}

export interface LowStockQuery {
  threshold?: string;
  limit?: string;
}

export interface TopSellingQuery extends DateRangeQuery {
  limit?: string;
  sortBy?: 'quantity' | 'revenue';
}

export interface LogQuery {
  file?: string;
  page?: string;
  limit?: string;
}