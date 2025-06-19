import { Types } from "mongoose";

// types/aggregations.ts
export interface YearlySales {
  month: number;
  totalRevenue: number;
  salesCount: number;
}

export interface MonthlySales {
  month: number;
  dailySales: {
    day: number;
    totalRevenue: number;
    salesCount: number;
  }[];
}

export interface WeeklySales {
  week: number;
  dailySales: {
    date: string;
    totalRevenue: number;
    salesCount: number;
  }[];
}

export interface TopSellingProduct {
  productId: Types.ObjectId;
  title: string;
  slug?: string;
  thumbnail?: string;
  totalRevenue: number;
  totalQuantitySold: number;
}

export interface CustomerWithDues {
  _id: Types.ObjectId;
  fullname: string;
  email: string;
  mobileNumber: string;
  remainingAmount: number;
  totalPurchasedAmount?: number;
}

export interface TopCustomer {
  _id: Types.ObjectId;
  fullname: string;
  email: string;
  periodPurchasedAmount?: number;
  totalPurchasedAmountGlobal?: number;
}

export interface InventoryValue {
  totalValue: number;
  totalItemsInStock: number;
}

export interface PaymentMethodStats {
  _id: string;
  totalAmount: number;
  count: number;
}

export interface OverallRating {
  overallAverage: number;
  totalReviewsConsidered: number;
}