import mongoose, { Schema, Document, Model, PopulateOptions } from 'mongoose';
import Customer, { ICustomer } from './customerModel'; // Assuming customerModel.ts exports ICustomer
import Product, { IProduct } from './productModel'; // Assuming productModel.ts exports IProduct
import User, { IUser } from './UserModel'; // Assuming UserModel.ts exports IUser

// 1. Interfaces for nested objects
export interface IBankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branch: string;
}

export interface ISalesHistoryItem {
  customer: mongoose.Types.ObjectId | ICustomer;
  product: mongoose.Types.ObjectId | IProduct;
  quantity: number;
  salePrice: number; // Price per unit at the time of sale
  saleDate: Date;
  totalAmount: number; // quantity * salePrice
}

// 2. Interface for Seller document
export interface ISeller extends Document {
  name: string;
  owner: mongoose.Types.ObjectId | IUser;
  profile?: string; // Corrected from prifile
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'blocked';
  shopName: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  gstin: string;
  pan: string;
  contactNumber: string;
  bankDetails: IBankDetails;
  salesHistory: ISalesHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

// 3. Interface for Seller Model (if you have static methods)
export interface ISellerModel extends Model<ISeller> {
  // Add any static methods specific to Seller model here
}

const sellerSchema = new Schema<ISeller>({
  name: {
    type: String,
    required: [true, 'Seller name is required'],
    trim: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  profile: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended', 'blocked'],
    default: 'pending',
  },
  shopName: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
  },
  address: {
    street: { type: String, required: [true, 'Street is required'] },
    city: { type: String, required: [true, 'City is required'] },
    state: { type: String, required: [true, 'State is required'] },
    pincode: {
      type: String,
      required: [true, 'PIN code is required'],
      match: [/^\d{6}$/, 'Invalid Indian PIN code'],
    },
  },
  gstin: {
    type: String,
    required: [true, 'GSTIN is required'],
    match: [/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format'],
  },
  pan: {
    type: String,
    required: [true, 'PAN is required'],
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'],
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
  },
  bankDetails: {
    accountHolderName: {
      type: String,
      required: [true, 'Account holder name is required'],
      trim: true,
    },
    accountNumber: {
      type: String,
      required: [true, 'Bank account number is required'],
      match: [/^\d{9,18}$/, 'Invalid bank account number'],
    },
    ifscCode: {
      type: String,
      required: [true, 'IFSC code is required'],
      match: [/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code'],
    },
    bankName: {
      type: String,
      required: [true, 'Bank name is required'],
      trim: true,
    },
    branch: {
      type: String,
      required: [true, 'Bank branch is required'],
      trim: true,
    },
  },
  salesHistory: [
    {
      customer: {
        type: Schema.Types.ObjectId,
        ref: 'Customer',
        required: true,
      },
      product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      salePrice: {
        type: Number,
        required: true,
      },
      saleDate: {
        type: Date,
        default: Date.now,
      },
      totalAmount: {
        type: Number,
        required: true,
      },
    },
  ],
}, { timestamps: true });


// Pre-find hook for population
sellerSchema.pre(/^find/, function (this: mongoose.Query<ISeller, ISeller>, next) {
    this.populate([
        { path: 'owner', select: 'name email' },
        { path: 'salesHistory.customer', select: 'fullname email' },
        { path: 'salesHistory.product', select: 'title' }
    ] as PopulateOptions[]);
    next();
});

const Seller = mongoose.model<ISeller, ISellerModel>('Seller', sellerSchema);
export default Seller;