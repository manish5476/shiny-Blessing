import mongoose, { Schema, Document, Model, PopulateOptions } from 'mongoose';
import Product, { IProduct } from './productModel'; // Assuming productModel.ts exports IProduct and the Product model
// import Payment, { IPayment } from './paymentModel'; // Uncomment and import if you have Payment model and interface
import Invoice, { IInvoice } from './invoiceModel'; // Assuming invoiceModel.ts exports IInvoice and the Invoice model
import Customer, { ICustomer } from './customerModel'; // Assuming customerModel.ts exports ICustomer and the Customer model
import User, { IUser } from './UserModel'; // Assuming you have a UserModel and IUser interface

// 1. Define Interfaces for your Schemas
// This is crucial for TypeScript to understand the shape of your documents.

export interface IOrderItem {
  product: mongoose.Types.ObjectId | IProduct; // Can be ObjectId or populated Product document
  quantity: number;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId | IUser;
  owner: mongoose.Types.ObjectId | IUser; // Assuming owner is also a User
  customer: mongoose.Types.ObjectId | ICustomer;
  products: IOrderItem[];
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  totalPrice: number;
  shippingAddress: string;
  paymentMethod: 'stripe' | 'credit_card' | 'upi' | 'bank_transfer';
  payment?: mongoose.Types.ObjectId | any; // Use IPayment when you uncomment Payment model
  invoice?: mongoose.Types.ObjectId | IInvoice;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Define the Schema for OrderItem
const orderItemSchema = new Schema<IOrderItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
});

// 3. Define the Schema for Order
const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User', // Assuming owner is a User
      required: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    products: [orderItemSchema],
    status: {
      type: String,
      enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
      default: 'Pending',
    },
    totalPrice: {
      type: Number,
      required: true,
      min: [0, 'Total price cannot be negative'],
    },
    shippingAddress: {
      type: String,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['stripe', 'credit_card', 'upi', 'bank_transfer'],
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    invoice: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// 🔍 Indexes
orderSchema.index({ user: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ createdAt: -1 });

// 🔄 Pre hooks for auto-populate
// Use PopulateOptions array for better type inference with multiple paths
const populateFields: PopulateOptions[] = [
  { path: 'user', select: 'name email' },
  { path: 'customer', select: 'fullname email' },
  { path: 'products.product', select: 'title finalPrice thumbnail' },
  { path: 'payment', select: 'amount status transactionId' },
  { path: 'invoice', select: 'invoiceNumber totalAmount status' },
];

orderSchema.pre(/^find/, function (next) {
  // Cast 'this' to Query<any, IOrder> to help TypeScript understand the context
  // This is a common workaround when Mongoose's internal types are not fully inferable
  (this as mongoose.Query<any, IOrder>).populate(populateFields);
  next();
});

// 🏷️ Pre-save hook to update product stock (with transaction)
orderSchema.pre('save', async function (next) {
  const doc = this as IOrder; // Cast 'this' to IOrder for proper type checking
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    for (const item of doc.products) {
      // Ensure Product is imported and has a valid type for findById
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product ${item.product} not found`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.title}`);
      }
      product.stock -= item.quantity;
      await product.save({ session });
    }
    await session.commitTransaction();
    next();
  } catch (error: unknown) { // Use 'unknown' for better type safety
    await session.abortTransaction();
    next(error instanceof Error ? error : new Error('Unknown error during order save transaction'));
  } finally {
    session.endSession();
  }
});

// 4. Create and export the Mongoose Model
// Define a type for the Order Model
export type OrderModel = Model<IOrder>;
const Order = (mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema)) as OrderModel;

export default Order;