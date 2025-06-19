import mongoose, { Document, Schema, Model, PopulateOptions } from 'mongoose';
import Invoice, { IInvoice } from './invoiceModel'; // Assuming invoiceModel.ts exports IInvoice
import Product, { IProduct } from './productModel'; // Assuming productModel.ts exports IProduct
import User, { IUser } from './UserModel'; // Assuming UserModel.ts exports IUser

// Interfaces for nested objects
export interface IPhoneNumber {
  number: string;
  type: 'home' | 'mobile' | 'work';
  primary: boolean;
}

export interface IAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  type: 'billing' | 'shipping' | 'home' | 'work';
  isDefault: boolean;
}

export interface ICartItem {
  productId: mongoose.Types.ObjectId | IProduct; // Can be ObjectId or populated Product
  invoiceIds: (mongoose.Types.ObjectId | IInvoice)[]; // Can be ObjectId or populated Invoice
}

export interface ICart {
  items: ICartItem[];
}

// Interface for Customer document
export interface ICustomer extends Document {
  owner: mongoose.Types.ObjectId | IUser;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'blocked';
  profileImg?: string;
  email?: string;
  fullname: string;
  mobileNumber: string;
  phoneNumbers: IPhoneNumber[];
  addresses: IAddress[];
  cart: ICart;
  guaranteerId?: mongoose.Types.ObjectId | ICustomer;
  totalPurchasedAmount?: number;
  remainingAmount: number;
  paymentHistory: mongoose.Types.ObjectId[]; // This will be populated as IPayment[] later
  metadata: Map<string, any>;
}

// Interface for Customer model with static methods
export interface ICustomerModel extends Model<ICustomer> {
  updateRemainingAmount(customerId: mongoose.Types.ObjectId): Promise<ICustomer | null>;
  getUserWithTotals(query: Record<string, any>): Promise<ICustomer | null>;
}

const customerSchema = new Schema<ICustomer>({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'suspended', 'blocked'],
    default: 'pending',
  },
  profileImg: { type: String },
  email: { type: String, unique: true, match: /.+\@.+\..+/ },
  fullname: { type: String, required: true },
  mobileNumber: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        return /^0?[6-9]\d{9}$/.test(v); // Updated regex
      },
      message: (props: { value: string }) => `${props.value} is not a valid mobile number!`,
    },
  },
  phoneNumbers: {
    type: [
      {
        number: { type: String, required: true },
        type: { type: String, enum: ['home', 'mobile', 'work'], required: true },
        primary: { type: Boolean, default: false },
      },
    ],
    validate: {
      validator: function (this: ICustomer, v: IPhoneNumber[]) {
        if (!this.guaranteerId) {
          return Array.isArray(v) && v.length > 0;
        }
        return true;
      },
      message: 'Phone number is required if no guaranteer is provided.',
    },
  },
  addresses: [
    {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      country: { type: String, required: true },
      type: { type: String, enum: ['billing', 'shipping', 'home', 'work'], required: true },
      isDefault: { type: Boolean, default: false },
    },
  ],
  cart: {
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
      },
    ],
  },
  guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false },
  totalPurchasedAmount: { type: Number, default: 0 }, // Added default
  remainingAmount: { type: Number, default: 0 },
  paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }], // Refers to Payment model
  metadata: { type: Map, of: Schema.Types.Mixed },
}, { timestamps: true });

// Consolidated pre-find hook for population
customerSchema.pre(/^find/, function (this: mongoose.Query<ICustomer, ICustomer>, next) {
  this.populate([
    {
      path: 'cart.items.productId',
      select: 'title finalPrice thumbnail description name price',
    },
    {
      path: 'cart.items.invoiceIds',
      select: 'invoiceNumber totalAmount invoiceDate status amount date',
    },
    {
      path: 'paymentHistory',
      select: 'amount status createdAt transactionId',
    },
    {
      path: 'owner',
      select: 'name email',
    },
    {
      path: 'guaranteerId',
      select: 'fullname email mobileNumber',
    }
  ] as PopulateOptions[]); // Explicitly cast to PopulateOptions[]
  next();
});

// Helper function definitions (moved outside schema for clarity, but could be statics)
// These functions use `mongoose.model('Customer')` which correctly resolves to the typed model
async function calculateTotalPurchasedAmount(customerId: mongoose.Types.ObjectId): Promise<void> {
  try {
    const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer');
    const customer = await Customer.findById(customerId);
    if (!customer) {
      console.error("Customer not found for total purchased amount calculation");
      return;
    }
    const aggregationResult = await Customer.aggregate([
      { $match: { _id: customer._id } },
      {
        $lookup: {
          from: 'invoices', // Collection name for Invoice model
          localField: 'cart.items.invoiceIds',
          foreignField: '_id',
          as: 'invoices',
        },
      },
      { $unwind: { path: '$invoices', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$_id',
          totalAmount: { $sum: { $ifNull: ['$invoices.totalAmount', 0] } },
        },
      },
      { $project: { _id: 0, totalAmount: 1 } },
    ]);
    let totalPurchasedAmount = 0;
    if (aggregationResult.length > 0) {
      totalPurchasedAmount = aggregationResult[0].totalAmount || 0;
    }
    customer.totalPurchasedAmount = totalPurchasedAmount;
    await customer.save();
  } catch (error: unknown) {
    console.error("Error calculating total purchased amount:", error instanceof Error ? error.message : error);
  }
}

async function calculateRemainingAmount(customerId: mongoose.Types.ObjectId): Promise<void> {
  try {
    const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer');
    // Populate paymentHistory to access 'amount' directly
    const customer = await Customer.findById(customerId).populate('paymentHistory', 'amount');
    if (!customer) {
      console.log("Customer not found for remaining amount calculation");
      return;
    }

    // Ensure paymentHistory is an array and safe to iterate
    const totalPaid = (customer.paymentHistory as unknown as Array<{ amount: number }>).reduce((sum, payment) => sum + (payment.amount || 0), 0);

    const totalPurchased = customer.totalPurchasedAmount || 0;

    customer.remainingAmount = Math.max(totalPurchased - totalPaid, 0);
    await customer.save();
  } catch (err: unknown) {
    console.error("Error calculating remaining amount:", err instanceof Error ? err.message : err);
  }
}

customerSchema.pre<ICustomer>('save', function (next) {
  if (this.phoneNumbers && this.phoneNumbers.length > 0 && !this.mobileNumber) {
    this.mobileNumber = this.phoneNumbers[0].number;
  }
  this.updatedAt = new Date(); // Manually update updatedAt as timestamps might not trigger for subdocuments
  next();
});

// Static method implementation
customerSchema.statics.updateRemainingAmount = async function (
  customerId: mongoose.Types.ObjectId
): Promise<ICustomer | null> {
  try {
    // We already have Customer as ICustomerModel, so directly use this.findById
    const customer = await (this as ICustomerModel).findById(customerId).populate('paymentHistory', 'amount');
    if (!customer) {
      console.error("Customer not found for static updateRemainingAmount");
      return null;
    }

    const totalPaid = (customer.paymentHistory as unknown as Array<{ amount: number }>).reduce(
      (sum: number, payment: { amount: number }) => sum + (payment.amount || 0),
      0
    );

    const totalPurchased = customer.totalPurchasedAmount || 0;

    customer.remainingAmount = Math.max(totalPurchased - totalPaid, 0);

    await customer.save();
    return customer;
  } catch (error: unknown) {
    console.error("Error updating remaining amount (static method):", error instanceof Error ? error.message : error);
    return null;
  }
};

customerSchema.statics.getUserWithTotals = async function (query: Record<string, any>): Promise<ICustomer | null> {
  // Find the user using the typed model
  let user: ICustomer | null = await (this as ICustomerModel).findOne(query);
  if (!user) return null;

  // Explicitly recalculate totals
  // Fix: Cast user._id to mongoose.Types.ObjectId
  await calculateTotalPurchasedAmount(user._id as mongoose.Types.ObjectId);
  await calculateRemainingAmount(user._id as mongoose.Types.ObjectId);

  // Re-fetch the updated user with population
  user = await (this as ICustomerModel).findById(user._id);
  return user;
};

const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer', customerSchema);
export default Customer;