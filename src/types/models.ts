// types/models.ts
import { Types } from 'mongoose';

export interface IProduct {
  _id: Types.ObjectId;
  title: string;
  slug: string;
  stock: number;
  sku: string;
  availabilityStatus: string;
  rate: number;
  thumbnail: string;
  ratingAverage: number;
  ratingQuantity: number;
}

export interface IInvoiceItem {
  product: Types.ObjectId;
  quantity: number;
  amount: number;
  customTitle?: string;
}

export interface IInvoice {
  _id: Types.ObjectId;
  invoiceDate: Date;
  totalAmount: number;
  status: string;
  buyer: Types.ObjectId;
  items: IInvoiceItem[];
  invoiceNumber?: string;
  dueDate?: Date;
}

export interface ICustomer {
  _id: Types.ObjectId;
  fullname: string;
  email: string;
  mobileNumber: string;
  remainingAmount: number;
  totalPurchasedAmount: number;
  createdAt: Date;
}

export interface IPayment {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  amount: number;
  status: string;
  paymentMethod: string;
  transactionId?: string;
  createdAt: Date;
}

export interface IReview {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  product: Types.ObjectId;
  rating: number;
  createdAt: Date;
}