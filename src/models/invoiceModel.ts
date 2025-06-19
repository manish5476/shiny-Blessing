import mongoose, { Schema, Document, Model, PopulateOptions } from 'mongoose';
import Product, { IProduct } from './productModel'; // Assuming productModel.ts exports IProduct
import User, { IUser } from './UserModel'; // Assuming UserModel.ts exports IUser
import Customer, { ICustomer, ICartItem, ICustomerModel } from './customerModel'; // Import ICustomerModel by name
import Seller, { ISeller } from './sellerModel'; // Assuming sellerModel.ts exports ISeller

// 1. Interfaces for nested objects
export interface IInvoiceItem {
  product?: mongoose.Types.ObjectId | IProduct; // Optional for custom items, can be ObjectId or populated Product
  customTitle?: string;
  quantity: number;
  discount: number;
  rate: number;
  taxableValue: number;
  gstRate: number;
  gstAmount: number;
  amount: number;
  isCustomProduct: boolean;
}

// 2. Interface for Invoice document
export interface IInvoice extends Document {
  owner: mongoose.Types.ObjectId 
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date;
  seller: mongoose.Types.ObjectId | ISeller;
  buyer: mongoose.Types.ObjectId | ICustomer;
  items: IInvoiceItem[];
  subTotal: number;
  totalDiscount: number;
  gst: number;
  totalAmount: number;
  status: 'paid' | 'unpaid' | 'partially paid' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;

  // Virtuals (TypeScript doesn't directly type virtuals on the document interface,
  // but we can declare them as optional properties that will be present when populated)
  sellerDetails?: ISeller;
  buyerDetails?: ICustomer;
  itemDetails?: IProduct[]; // Array because it's a many-to-many virtual populate
}

// 3. Interface for Invoice Model
export interface IInvoiceModel extends Model<IInvoice> {
  // Add any static methods here if you have them
}

const invoiceItemSchema = new Schema<IInvoiceItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product' },
  customTitle: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  discount: { type: Number, default: 0, min: 0 },
  rate: { type: Number, required: true, min: 0 },
  taxableValue: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, min: 0 },
  gstAmount: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true, min: 0 },
  isCustomProduct: { type: Boolean, default: false },
});

const invoiceSchema = new Schema<IInvoice>({
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  invoiceNumber: { type: String, required: true, unique: true },
  invoiceDate: { type: Date, required: true },
  dueDate: { type: Date },
  seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
  buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  items: [invoiceItemSchema],
  subTotal: { type: Number, required: true, min: 0 },
  totalDiscount: { type: Number, default: 0, min: 0 },
  gst: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['paid', 'unpaid', 'partially paid', 'cancelled'],
    default: 'unpaid',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// 🔗 Virtuals
// Define virtuals with types
invoiceSchema.virtual('sellerDetails', {
  ref: 'Seller',
  localField: 'seller',
  foreignField: '_id',
  justOne: true,
});
invoiceSchema.virtual('buyerDetails', {
  ref: 'Customer',
  localField: 'buyer',
  foreignField: '_id',
  justOne: true,
});
invoiceSchema.virtual('itemDetails', {
  ref: 'Product',
  localField: 'items.product',
  foreignField: '_id',
});

// 🧠 Auto-populate relevant references
invoiceSchema.pre(/^find/, function (this: mongoose.Query<IInvoice, IInvoice>, next) {
  this.populate('sellerDetails', '' as keyof ISeller) // Cast empty string to keyof ISeller if needed, or remove if not specifying fields
    .populate('buyerDetails', 'fullname phoneNumbers addresses' as keyof ICustomer)
    .populate('itemDetails', 'title' as keyof IProduct);
  next();
});

// 🧮 Pre-save: compute totals and update inventory
invoiceSchema.pre<IInvoice>('save', async function (next) {
  const doc = this; // 'this' is the document being saved
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    if (!doc.dueDate) {
      doc.dueDate = new Date(doc.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    let subTotal = 0,
      totalDiscount = 0,
      totalGst = 0;

    for (const item of doc.items) {
      let product: IProduct | null = null;
      if (item.product) {
        // Ensure Product is imported and correctly typed
        product = await Product.findById(item.product).session(session);
      }

      if (product) {
        // Inventory product
        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for ${product.title}`);
        }

        // Auto-fill missing fields
        if (item.rate == null) item.rate = product.rate ?? 0;
        if (item.gstRate == null) item.gstRate = product.gstRate ?? 0;
        if (!item.customTitle) item.customTitle = product.title;

        item.isCustomProduct = false;

        product.stock -= item.quantity;
        await product.save({ session });
      } else {
        // Custom product
        if (!item.customTitle || typeof item.customTitle !== 'string') {
          throw new Error(`Custom title must be provided for non-inventory product`);
        }
        if (item.rate == null) throw new Error(`Rate must be provided for custom product "${item.customTitle}"`);
        if (item.gstRate == null) item.gstRate = 0;

        item.isCustomProduct = true;
      }

      // Calculations
      item.taxableValue = item.quantity * item.rate;
      const discountedValue = item.taxableValue - (item.taxableValue * item.discount) / 100;
      item.gstAmount = (discountedValue * item.gstRate) / 100;
      item.amount = discountedValue + item.gstAmount;

      subTotal += item.taxableValue;
      totalDiscount += (item.taxableValue * item.discount) / 100;
      totalGst += item.gstAmount;
    }

    doc.subTotal = subTotal;
    doc.totalDiscount = totalDiscount;
    doc.gst = totalGst;
    doc.totalAmount = subTotal + totalGst - totalDiscount;

    await session.commitTransaction();
    next();
  } catch (error: unknown) {
    await session.abortTransaction();
    next(error instanceof Error ? error : new Error('Unknown error occurred during transaction'));
  } finally {
    session.endSession();
  }
});

// 🛒 Post-save: update customer cart and totals
invoiceSchema.post<IInvoice>('save', async function (doc) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Import Customer directly, avoiding `require` in TS files for type safety
    // This assumes customerModel.ts is already in TS and exports `default Customer`
    const CustomerModel = await import('./customerModel').then(m => m.default) as Model<ICustomer, any>; // Cast to Model<ICustomer, any>

    const customer = await CustomerModel.findById(doc.buyer).session(session);
    if (!customer) {
      throw new Error('Customer not found');
    }

    for (const item of doc.items) {
      // Ensure productId is an ObjectId for comparison, if it exists
      const productId = item.product instanceof mongoose.Types.ObjectId ? item.product : (item.product as IProduct)?._id;

      const existing = customer.cart.items.find(
        (cartItem: ICartItem) => cartItem.productId?.toString() === productId?.toString()
      );

      if (existing) {
        existing.invoiceIds.push(doc._id);
      } else if (productId) { // Only push if product exists (i.e., not a custom product without a product ref)
        customer.cart.items.push({ productId: productId, invoiceIds: [doc._id] });
      }
    }

    await customer.save({ session });

    // Call static method with explicit typing and session
    // This assumes updateRemainingAmount is a static method on ICustomerModel
    if (typeof (CustomerModel as ICustomerModel).updateRemainingAmount === 'function') {
        await (CustomerModel as ICustomerModel).updateRemainingAmount(doc.buyer as mongoose.Types.ObjectId);
    } else {
        console.warn("updateRemainingAmount function not found or not a static method in Customer model");
    }


    await session.commitTransaction();
  } catch (error: unknown) {
    await session.abortTransaction();
    throw new mongoose.Error(`Failed to update customer cart: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    session.endSession();
  }
});

const Invoice = mongoose.model<IInvoice, IInvoiceModel>('Invoice', invoiceSchema);
export default Invoice;