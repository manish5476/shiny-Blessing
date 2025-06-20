import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import Product, { IProduct } from './productModel';
import { IPayment } from './paymentModel';
import { ClientSession } from 'mongoose'; // Ensure ClientSession is imported

// Interface for OrderProduct
interface IOrderProduct {
  product: Types.ObjectId;
  quantity: number;
  price: number;
}

// Interface for Order document
export interface IOrder extends Document {
  user: Types.ObjectId;
  products: IOrderProduct[];
  totalAmount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment?: Types.ObjectId | IPayment;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Order model
export interface IOrderModel extends Model<IOrder> {
  // Add static methods here if needed
}

// OrderProduct schema
const orderProductSchema = new Schema<IOrderProduct>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required'],
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
});

const orderSchema = new Schema<IOrder, IOrderModel>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true,
  },
  products: [orderProductSchema],
  totalAmount: {
    type: Number,
    required: [true, 'Total amount is required'],
    min: [0, 'Total amount cannot be negative'],
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  payment: {
    type: Schema.Types.ObjectId,
    ref: () => 'Payment',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Pre-save middleware to update stock
orderSchema.pre<IOrder>('save', async function (next) {
  const doc = this;
  let session: ClientSession | null = null; // Initialize session as nullable
  const productsToUpdate: IProduct[] = []; // Declare at correct scope

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    for (const item of doc.products) {
      // item.product is already Types.ObjectId as per IOrderProduct interface
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        throw new Error(`Product ${item.product} not found`);
      }
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.title}`);
      }
      product.stock -= item.quantity;
      productsToUpdate.push(product);
    }

    await Promise.all(productsToUpdate.map(product => product.save({ session })));
    doc.updatedAt = new Date();
    await session.commitTransaction();
    next();
  } catch (error: unknown) {
    if (session) {
      await session.abortTransaction();
    }
    // Roll back stock changes only for products that were actually decremented
    for (const product of productsToUpdate) {
      // Cast product._id to Types.ObjectId for reliable comparison
      const originalOrderItem = doc.products.find(item => item.product.toString() === (product._id as Types.ObjectId).toString());
      if (originalOrderItem) {
        product.stock += originalOrderItem.quantity;
        // It's generally better to use the same session for rollbacks,
        // or ensure the product.save() itself doesn't start a new transaction
        // if this middleware's session is already aborted.
        // Using `session: null` is effectively saying "save outside this transaction",
        // which might be okay if the goal is to revert quickly.
        await product.save({ session: null });
      }
    }
    next(error instanceof Error ? error : new Error('Unknown error during order save'));
  } finally {
    if (session) { // Only end session if it was successfully started
      session.endSession();
    }
  }
});

// Create and export the Order model
const Order = mongoose.model<IOrder, IOrderModel>('Order', orderSchema);

export default Order;
// import mongoose, { Schema, Document, Model, PopulateOptions } from 'mongoose';
// import Product, { IProduct } from './productModel'; // Assuming productModel.ts exports IProduct and the Product model
// // import Payment, { IPayment } from './paymentModel'; // Uncomment and import if you have Payment model and interface
// import Invoice, { IInvoice } from './invoiceModel'; // Assuming invoiceModel.ts exports IInvoice and the Invoice model
// import Customer, { ICustomer } from './customerModel'; // Assuming customerModel.ts exports ICustomer and the Customer model
// import User, { IUser } from './UserModel'; // Assuming you have a UserModel and IUser interface

// // 1. Define Interfaces for your Schemas
// // This is crucial for TypeScript to understand the shape of your documents.

// export interface IOrderItem {
//   product: mongoose.Types.ObjectId | IProduct; // Can be ObjectId or populated Product document
//   quantity: number;
// }

// export interface IOrder extends Document {
//   user: mongoose.Types.ObjectId | IUser;
//   owner: mongoose.Types.ObjectId | IUser; // Assuming owner is also a User
//   customer: mongoose.Types.ObjectId | ICustomer;
//   products: IOrderItem[];
//   status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
//   totalPrice: number;
//   shippingAddress: string;
//   paymentMethod: 'stripe' | 'credit_card' | 'upi' | 'bank_transfer';
//   payment?: mongoose.Types.ObjectId | any; // Use IPayment when you uncomment Payment model
//   invoice?: mongoose.Types.ObjectId | IInvoice;
//   isPaid: boolean;
//   createdAt: Date;
//   updatedAt: Date;
// }

// // 2. Define the Schema for OrderItem
// const orderItemSchema = new Schema<IOrderItem>({
//   product: {
//     type: Schema.Types.ObjectId,
//     ref: 'Product',
//     required: true,
//   },
//   quantity: {
//     type: Number,
//     required: true,
//     min: [1, 'Quantity must be at least 1'],
//   },
// });

// // 3. Define the Schema for Order
// const orderSchema = new Schema<IOrder>(
//   {
//     user: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     owner: {
//       type: Schema.Types.ObjectId,
//       ref: 'User', // Assuming owner is a User
//       required: true,
//     },
//     customer: {
//       type: Schema.Types.ObjectId,
//       ref: 'Customer',
//       required: true,
//     },
//     products: [orderItemSchema],
//     status: {
//       type: String,
//       enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
//       default: 'Pending',
//     },
//     totalPrice: {
//       type: Number,
//       required: true,
//       min: [0, 'Total price cannot be negative'],
//     },
//     shippingAddress: {
//       type: String,
//       required: true,
//     },
//     paymentMethod: {
//       type: String,
//       required: true,
//       enum: ['stripe', 'credit_card', 'upi', 'bank_transfer'],
//     },
//     payment: {
//       type: Schema.Types.ObjectId,
//       ref: 'Payment',
//     },
//     invoice: {
//       type: Schema.Types.ObjectId,
//       ref: 'Invoice',
//     },
//     isPaid: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// // 🔍 Indexes
// orderSchema.index({ user: 1 });
// orderSchema.index({ customer: 1 });
// orderSchema.index({ createdAt: -1 });

// // 🔄 Pre hooks for auto-populate
// // Use PopulateOptions array for better type inference with multiple paths
// const populateFields: PopulateOptions[] = [
//   { path: 'user', select: 'name email' },
//   { path: 'customer', select: 'fullname email' },
//   { path: 'products.product', select: 'title finalPrice thumbnail' },
//   { path: 'payment', select: 'amount status transactionId' },
//   { path: 'invoice', select: 'invoiceNumber totalAmount status' },
// ];

// orderSchema.pre(/^find/, function (next) {
//   // Cast 'this' to Query<any, IOrder> to help TypeScript understand the context
//   // This is a common workaround when Mongoose's internal types are not fully inferable
//   (this as mongoose.Query<any, IOrder>).populate(populateFields);
//   next();
// });

// // 🏷️ Pre-save hook to update product stock (with transaction)
// orderSchema.pre('save', async function (next) {
//   const doc = this as IOrder; // Cast 'this' to IOrder for proper type checking
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     for (const item of doc.products) {
//       // Ensure Product is imported and has a valid type for findById
//       const product = await Product.findById(item.product).session(session);
//       if (!product) {
//         throw new Error(`Product ${item.product} not found`);
//       }
//       if (product.stock < item.quantity) {
//         throw new Error(`Insufficient stock for ${product.title}`);
//       }
//       product.stock -= item.quantity;
//       await product.save({ session });
//     }
//     await session.commitTransaction();
//     next();
//   } catch (error: unknown) { // Use 'unknown' for better type safety
//     await session.abortTransaction();
//     next(error instanceof Error ? error : new Error('Unknown error during order save transaction'));
//   } finally {
//     session.endSession();
//   }
// });

// // 4. Create and export the Mongoose Model
// // Define a type for the Order Model
// export type OrderModel = Model<IOrder>;
// const Order = (mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema)) as OrderModel;

// export default Order;