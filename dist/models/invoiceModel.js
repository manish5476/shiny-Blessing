"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const productModel_1 = __importDefault(require("./productModel"));
const customerModel_1 = __importDefault(require("./customerModel"));
const mongoose_2 = require("mongoose"); // Import MongooseError
// InvoiceItem schema
const invoiceItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
    },
    customTitle: String,
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1'],
    },
    rate: Number,
    discount: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%'],
    },
    gstRate: Number,
    taxableValue: {
        type: Number,
        required: [true, 'Taxable value is required'],
    },
    gstAmount: {
        type: Number,
        required: [true, 'GST amount is required'],
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
    },
    isCustomProduct: {
        type: Boolean,
        default: false,
    },
});
const invoiceSchema = new mongoose_1.Schema({
    buyer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Buyer is required'],
        index: true,
    },
    invoiceNumber: {
        type: String,
        required: [true, 'Invoice number is required'],
        unique: true,
    },
    invoiceDate: {
        type: Date,
        required: [true, 'Invoice date is required'],
        default: Date.now,
    },
    dueDate: Date,
    items: [invoiceItemSchema],
    subTotal: {
        type: Number,
        required: [true, 'Subtotal is required'],
    },
    totalDiscount: {
        type: Number,
        required: [true, 'Total discount is required'],
    },
    gst: {
        type: Number,
        required: [true, 'GST is required'],
    },
    totalAmount: {
        type: Number,
        required: [true, 'Total amount is required'],
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Helper function to calculate item totals
const calculateItemTotals = (item, product) => {
    if (product) {
        if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.title}`);
        }
        if (item.rate == null)
            item.rate = product.rate ?? 0;
        if (item.gstRate == null)
            item.gstRate = product.gstRate ?? 0;
        if (!item.customTitle)
            item.customTitle = product.title;
        item.isCustomProduct = false;
    }
    else {
        if (!item.customTitle)
            throw new Error('Custom title required for non-inventory product');
        if (item.rate == null)
            throw new Error(`Rate required for custom product "${item.customTitle}"`);
        if (item.gstRate == null)
            item.gstRate = 0;
        item.isCustomProduct = true;
    }
    item.taxableValue = item.quantity * item.rate;
    const discountedValue = item.taxableValue - (item.taxableValue * item.discount) / 100;
    item.gstAmount = (discountedValue * item.gstRate) / 100;
    item.amount = discountedValue + item.gstAmount;
};
// Helper function to update invoice totals
const updateInvoiceTotals = (doc) => {
    doc.subTotal = doc.items.reduce((sum, item) => sum + item.taxableValue, 0);
    doc.totalDiscount = doc.items.reduce((sum, item) => sum + (item.taxableValue * item.discount) / 100, 0);
    doc.gst = doc.items.reduce((sum, item) => sum + item.gstAmount, 0);
    doc.totalAmount = doc.subTotal + doc.gst - doc.totalDiscount;
};
// Pre-save middleware to calculate totals and update stock
invoiceSchema.pre('save', async function (next) {
    const doc = this;
    let session = null; // Initialize session as nullable
    try {
        session = await mongoose_1.default.startSession();
        session.startTransaction();
        if (!doc.dueDate) {
            doc.dueDate = new Date(doc.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        for (const item of doc.items) {
            let productIdForQuery = null;
            // Determine the product ID for the query, handling both ObjectId and populated IProduct
            if (item.product instanceof mongoose_1.Types.ObjectId) {
                productIdForQuery = item.product;
            }
            else if (item.product && item.product?._id) {
                // Explicitly cast to string because (item.product as IProduct)._id might be 'unknown'
                productIdForQuery = new mongoose_1.Types.ObjectId(item.product._id);
            }
            const product = productIdForQuery ? await productModel_1.default.findById(productIdForQuery).session(session) : null;
            calculateItemTotals(item, product);
            if (product) {
                product.stock -= item.quantity;
                await product.save({ session });
            }
        }
        updateInvoiceTotals(doc);
        await session.commitTransaction();
        next();
    }
    catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        next(error instanceof Error ? error : new Error('Unknown error during invoice save'));
    }
    finally {
        if (session) {
            session.endSession();
        }
    }
});
// Post-save middleware to update customer cart
invoiceSchema.post('save', async function (doc) {
    let session = null; // Initialize session as nullable
    try {
        session = await mongoose_1.default.startSession();
        session.startTransaction();
        const customer = await customerModel_1.default.findById(doc.buyer).session(session);
        if (!customer) {
            throw new Error('Customer not found');
        }
        for (const item of doc.items) {
            let productId; // Declare productId with the correct type
            // Safely determine productId and ensure it's a Types.ObjectId
            if (item.product instanceof mongoose_1.Types.ObjectId) {
                productId = item.product;
            }
            else if (item.product?._id) {
                // Explicitly cast to string because (item.product as IProduct)._id might be 'unknown'
                productId = new mongoose_1.Types.ObjectId(item.product._id);
            }
            else {
                // If productId cannot be determined or is not a valid ObjectId, skip
                console.warn('Skipping item in post-save due to invalid or missing productId:', item);
                continue;
            }
            const existing = customer.cart.items.find((cartItem) => cartItem.productId?.toString() === productId.toString());
            if (existing) {
                // Ensure doc._id is treated as Types.ObjectId
                existing.invoiceIds.push(doc._id);
            }
            else {
                // Ensure productId and doc._id are Types.ObjectId
                customer.cart.items.push({
                    productId: productId,
                    invoiceIds: [doc._id]
                });
            }
        }
        await customer.save({ session });
        // Ensure doc.buyer is treated as Types.ObjectId for the static method
        await customerModel_1.default.updateRemainingAmount(doc.buyer);
        await session.commitTransaction();
    }
    catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        // Use MongooseError for consistency and better error typing
        throw new mongoose_2.Error(`Failed to update customer cart: ${error instanceof Error ? error.message : String(error)}`);
    }
    finally {
        if (session) {
            session.endSession();
        }
    }
});
// Create and export the Invoice model
const Invoice = mongoose_1.default.model('Invoice', invoiceSchema);
exports.default = Invoice;
// import mongoose, { Schema, Document, Model, PopulateOptions } from 'mongoose';
// import Product, { IProduct } from './productModel'; // Assuming productModel.ts exports IProduct
// import User, { IUser } from './UserModel'; // Assuming UserModel.ts exports IUser
// import Customer, { ICustomer, ICartItem, ICustomerModel } from './customerModel'; // Import ICustomerModel by name
// import Seller, { ISeller } from './sellerModel'; // Assuming sellerModel.ts exports ISeller
// // 1. Interfaces for nested objects
// export interface IInvoiceItem {
//   product?: mongoose.Types.ObjectId | IProduct; // Optional for custom items, can be ObjectId or populated Product
//   customTitle?: string;
//   quantity: number;
//   discount: number;
//   rate: number;
//   taxableValue: number;
//   gstRate: number;
//   gstAmount: number;
//   amount: number;
//   isCustomProduct: boolean;
// }
// // 2. Interface for Invoice document
// export interface IInvoice extends Document {
//   owner: mongoose.Types.ObjectId
//   invoiceNumber: string;
//   invoiceDate: Date;
//   dueDate?: Date;
//   seller: mongoose.Types.ObjectId | ISeller;
//   buyer: mongoose.Types.ObjectId | ICustomer;
//   items: IInvoiceItem[];
//   subTotal: number;
//   totalDiscount: number;
//   gst: number;
//   totalAmount: number;
//   status: 'paid' | 'unpaid' | 'partially paid' | 'cancelled';
//   createdAt: Date;
//   updatedAt: Date;
//   // Virtuals (TypeScript doesn't directly type virtuals on the document interface,
//   // but we can declare them as optional properties that will be present when populated)
//   sellerDetails?: ISeller;
//   buyerDetails?: ICustomer;
//   itemDetails?: IProduct[]; // Array because it's a many-to-many virtual populate
// }
// // 3. Interface for Invoice Model
// export interface IInvoiceModel extends Model<IInvoice> {
//   // Add any static methods here if you have them
// }
// const invoiceItemSchema = new Schema<IInvoiceItem>({
//   product: { type: Schema.Types.ObjectId, ref: 'Product' },
//   customTitle: { type: String },
//   quantity: { type: Number, required: true, min: 1 },
//   discount: { type: Number, default: 0, min: 0 },
//   rate: { type: Number, required: true, min: 0 },
//   taxableValue: { type: Number, required: true, min: 0 },
//   gstRate: { type: Number, required: true, min: 0 },
//   gstAmount: { type: Number, required: true, min: 0 },
//   amount: { type: Number, required: true, min: 0 },
//   isCustomProduct: { type: Boolean, default: false },
// });
// const invoiceSchema = new Schema<IInvoice>({
//   owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//   invoiceNumber: { type: String, required: true, unique: true },
//   invoiceDate: { type: Date, required: true },
//   dueDate: { type: Date },
//   seller: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
//   buyer: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
//   items: [invoiceItemSchema],
//   subTotal: { type: Number, required: true, min: 0 },
//   totalDiscount: { type: Number, default: 0, min: 0 },
//   gst: { type: Number, default: 0, min: 0 },
//   totalAmount: { type: Number, required: true, min: 0 },
//   status: {
//     type: String,
//     enum: ['paid', 'unpaid', 'partially paid', 'cancelled'],
//     default: 'unpaid',
//   },
// }, {
//   timestamps: true,
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true },
// });
// // 🔗 Virtuals
// // Define virtuals with types
// invoiceSchema.virtual('sellerDetails', {
//   ref: 'Seller',
//   localField: 'seller',
//   foreignField: '_id',
//   justOne: true,
// });
// invoiceSchema.virtual('buyerDetails', {
//   ref: 'Customer',
//   localField: 'buyer',
//   foreignField: '_id',
//   justOne: true,
// });
// invoiceSchema.virtual('itemDetails', {
//   ref: 'Product',
//   localField: 'items.product',
//   foreignField: '_id',
// });
// // 🧠 Auto-populate relevant references
// invoiceSchema.pre(/^find/, function (this: mongoose.Query<IInvoice, IInvoice>, next) {
//   this.populate('sellerDetails', '' as keyof ISeller) // Cast empty string to keyof ISeller if needed, or remove if not specifying fields
//     .populate('buyerDetails', 'fullname phoneNumbers addresses' as keyof ICustomer)
//     .populate('itemDetails', 'title' as keyof IProduct);
//   next();
// });
// const calculateItemTotals = (item: IInvoiceItem, product: IProduct | null): void => {
//   if (product) {
//     if (product.stock < item.quantity) {
//       throw new Error(`Insufficient stock for ${product.title}`);
//     }
//     if (item.rate == null) item.rate = product.rate ?? 0;
//     if (item.gstRate == null) item.gstRate = product.gstRate ?? 0;
//     if (!item.customTitle) item.customTitle = product.title;
//     item.isCustomProduct = false;
//   } else {
//     if (!item.customTitle) throw new Error('Custom title required for non-inventory product');
//     if (item.rate == null) throw new Error(`Rate required for custom product "${item.customTitle}"`);
//     if (item.gstRate == null) item.gstRate = 0;
//     item.isCustomProduct = true;
//   }
//   item.taxableValue = item.quantity * item.rate;
//   const discountedValue = item.taxableValue - (item.taxableValue * item.discount) / 100;
//   item.gstAmount = (discountedValue * item.gstRate) / 100;
//   item.amount = discountedValue + item.gstAmount;
// };
// const updateInvoiceTotals = (doc: IInvoice): void => {
//   doc.subTotal = doc.items.reduce((sum, item) => sum + item.taxableValue, 0);
//   doc.totalDiscount = doc.items.reduce((sum, item) => sum + (item.taxableValue * item.discount) / 100, 0);
//   doc.gst = doc.items.reduce((sum, item) => sum + item.gstAmount, 0);
//   doc.totalAmount = doc.subTotal + doc.gst - doc.totalDiscount;
// };
// invoiceSchema.pre<IInvoice>('save', async function (next) {
//   const doc = this;
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     if (!doc.dueDate) {
//       doc.dueDate = new Date(doc.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
//     }
//     for (const item of doc.items) {
//       const product = item.product ? await Product.findById(item.product).session(session) : null;
//       calculateItemTotals(item, product);
//       if (product) {
//         product.stock -= item.quantity;
//         await product.save({ session });
//       }
//     }
//     updateInvoiceTotals(doc);
//     await session.commitTransaction();
//     next();
//   } catch (error: unknown) {
//     await session.abortTransaction();
//     next(error instanceof Error ? error : new Error('Unknown error during invoice save'));
//   } finally {
//     session.endSession();
//   }
// });
// // 🧮 Pre-save: compute totals and update inventory
// // invoiceSchema.pre<IInvoice>('save', async function (next) {
// //   const doc = this; // 'this' is the document being saved
// //   const session = await mongoose.startSession();
// //   session.startTransaction();
// //   try {
// //     if (!doc.dueDate) {
// //       doc.dueDate = new Date(doc.invoiceDate.getTime() + 7 * 24 * 60 * 60 * 1000);
// //     }
// //     let subTotal = 0,
// //       totalDiscount = 0,
// //       totalGst = 0;
// //     for (const item of doc.items) {
// //       let product: IProduct | null = null;
// //       if (item.product) {
// //         // Ensure Product is imported and correctly typed
// //         product = await Product.findById(item.product).session(session);
// //       }
// //       if (product) {
// //         // Inventory product
// //         if (product.stock < item.quantity) {
// //           throw new Error(`Insufficient stock for ${product.title}`);
// //         }
// //         // Auto-fill missing fields
// //         if (item.rate == null) item.rate = product.rate ?? 0;
// //         if (item.gstRate == null) item.gstRate = product.gstRate ?? 0;
// //         if (!item.customTitle) item.customTitle = product.title;
// //         item.isCustomProduct = false;
// //         product.stock -= item.quantity;
// //         await product.save({ session });
// //       } else {
// //         // Custom product
// //         if (!item.customTitle || typeof item.customTitle !== 'string') {
// //           throw new Error(`Custom title must be provided for non-inventory product`);
// //         }
// //         if (item.rate == null) throw new Error(`Rate must be provided for custom product "${item.customTitle}"`);
// //         if (item.gstRate == null) item.gstRate = 0;
// //         item.isCustomProduct = true;
// //       }
// //       // Calculations
// //       item.taxableValue = item.quantity * item.rate;
// //       const discountedValue = item.taxableValue - (item.taxableValue * item.discount) / 100;
// //       item.gstAmount = (discountedValue * item.gstRate) / 100;
// //       item.amount = discountedValue + item.gstAmount;
// //       subTotal += item.taxableValue;
// //       totalDiscount += (item.taxableValue * item.discount) / 100;
// //       totalGst += item.gstAmount;
// //     }
// //     doc.subTotal = subTotal;
// //     doc.totalDiscount = totalDiscount;
// //     doc.gst = totalGst;
// //     doc.totalAmount = subTotal + totalGst - totalDiscount;
// //     await session.commitTransaction();
// //     next();
// //   } catch (error: unknown) {
// //     await session.abortTransaction();
// //     next(error instanceof Error ? error : new Error('Unknown error occurred during transaction'));
// //   } finally {
// //     session.endSession();
// //   }
// // });
// // 🛒 Post-save: update customer cart and totals
// invoiceSchema.post<IInvoice>('save', async function (doc) {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     // Import Customer directly, avoiding `require` in TS files for type safety
//     // This assumes customerModel.ts is already in TS and exports `default Customer`
//     const CustomerModel = await import('./customerModel').then(m => m.default) as Model<ICustomer, any>; // Cast to Model<ICustomer, any>
//     const customer = await CustomerModel.findById(doc.buyer).session(session);
//     if (!customer) {
//       throw new Error('Customer not found');
//     }
//     for (const item of doc.items) {
//       // Ensure productId is an ObjectId for comparison, if it exists
//       const productId = item.product instanceof mongoose.Types.ObjectId ? item.product : (item.product as IProduct)?._id;
//       const existing = customer.cart.items.find(
//         (cartItem: ICartItem) => cartItem.productId?.toString() === productId?.toString()
//       );
//       if (existing) {
//         existing.invoiceIds.push(doc._id);
//       } else if (productId) { // Only push if product exists (i.e., not a custom product without a product ref)
//         customer.cart.items.push({ productId: productId, invoiceIds: [doc._id] });
//       }
//     }
//     await customer.save({ session });
//     // Call static method with explicit typing and session
//     // This assumes updateRemainingAmount is a static method on ICustomerModel
//     if (typeof (CustomerModel as ICustomerModel).updateRemainingAmount === 'function') {
//       await (CustomerModel as ICustomerModel).updateRemainingAmount(doc.buyer as mongoose.Types.ObjectId);
//     } else {
//       console.warn("updateRemainingAmount function not found or not a static method in Customer model");
//     }
//     await session.commitTransaction();
//   } catch (error: unknown) {
//     await session.abortTransaction();
//     throw new mongoose.Error(`Failed to update customer cart: ${error instanceof Error ? error.message : String(error)}`);
//   } finally {
//     session.endSession();
//   }
// });
// const Invoice = mongoose.model<IInvoice, IInvoiceModel>('Invoice', invoiceSchema);
// export default Invoice;
//# sourceMappingURL=invoiceModel.js.map