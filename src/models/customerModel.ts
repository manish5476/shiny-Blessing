import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import validator from 'validator';
import { IPayment } from './paymentModel';
import Invoice from './invoiceModel';

// Interface for PhoneNumber
export interface IPhoneNumber {
  number: string;
  type: 'home' | 'work' | 'mobile' | 'other';
  isPrimary: boolean;
}

// Interface for Address
export interface IAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

// Interface for CartItem
export interface ICartItem {
  productId: Types.ObjectId;
  invoiceIds: Types.ObjectId[];
}

// Interface for Cart
export interface ICart {
  items: ICartItem[];
}

// Interface for Customer document
export interface ICustomer extends Document {
  fullname: string;
  email?: string;
  phoneNumbers: IPhoneNumber[];
  addresses: IAddress[];
  cart: ICart;
  paymentHistory: Types.ObjectId[] | IPayment[];
  totalPurchasedAmount?: number;
  remainingAmount?: number;
  guaranteerId?: Types.ObjectId;
}

// Interface for Customer model
export interface ICustomerModel extends Model<ICustomer> {
  calculateTotalPurchasedAmountForCustomer(customerId: Types.ObjectId): Promise<number>;
  updateRemainingAmount(customerId: Types.ObjectId): Promise<void>;
}

// PhoneNumber schema
const phoneNumberSchema = new Schema<IPhoneNumber>({
  number: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
  },
  type: {
    type: String,
    enum: ['home', 'work', 'mobile', 'other'],
    default: 'mobile',
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
});

// Address schema
const addressSchema = new Schema<IAddress>({
  street: {
    type: String,
    required: [true, 'Street is required'],
    trim: true,
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
  },
  pincode: {
    type: String,
    required: [true, 'PIN code is required'],
    match: [/^\d{6}$/, 'PIN code must be a 6-digit number'],
  },
  country: {
    type: String,
    required: [true, 'Country is required'],
    trim: true,
  },
});

// CartItem schema
const cartItemSchema = new Schema<ICartItem>({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
  },
  invoiceIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Invoice',
  }],
});

// Cart schema
const cartSchema = new Schema<ICart>({
  items: [cartItemSchema],
});

const customerSchema = new Schema<ICustomer, ICustomerModel>({
  fullname: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
  },
  email: {
    type: String,
    lowercase: true,
    validate: {
      validator: (val: string | undefined) => !val || validator.isEmail(val),
      message: 'Please provide a valid email',
    },
  },
  phoneNumbers: {
    type: [phoneNumberSchema],
    validate: {
      validator: function (this: ICustomer, v: IPhoneNumber[]): boolean {
        return this.guaranteerId ? true : v.length > 0;
      },
      message: 'At least one phone number is required unless a guarantor is provided.',
    },
  },
  addresses: [addressSchema],
  cart: {
    type: cartSchema,
    default: { items: [] },
  },
  paymentHistory: [{
    type: Schema.Types.ObjectId,
    ref: 'Payment',
  }],
  totalPurchasedAmount: {
    type: Number,
    default: 0,
  },
  remainingAmount: {
    type: Number,
    default: 0,
  },
  guaranteerId: {
    type: Schema.Types.ObjectId,
    ref: () => 'Customer', // Lazy reference to avoid circular dependency
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Static method to calculate total purchased amount
customerSchema.statics.calculateTotalPurchasedAmountForCustomer = async function (
  customerId: Types.ObjectId
): Promise<number> {
  const invoices = await Invoice.find({ buyer: customerId }, 'totalAmount').lean();
  return invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
};

// Static method to update remaining amount
customerSchema.statics.updateRemainingAmount = async function (
  customerId: Types.ObjectId
): Promise<void> {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const customer = await this.findById(customerId)
      .populate<{ paymentHistory: IPayment[] }>('paymentHistory', 'amount')
      .session(session);
    if (!customer) {
      throw new Error(`Customer with ID ${customerId} not found`);
    }
    const totalPaid = customer.paymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    customer.remainingAmount = Math.max(customer.totalPurchasedAmount || 0 - totalPaid, 0);
    await customer.save({ session });
    await session.commitTransaction();
  } catch (err: unknown) {
    await session.abortTransaction();
    throw err instanceof Error ? err : new Error('Unknown error during remaining amount update');
  } finally {
    session.endSession();
  }
};

// Create and export the Customer model
const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer', customerSchema);

export default Customer;
// // src/models/customerModel.ts

// import mongoose, { Document, Schema, Model, PopulateOptions, Types } from 'mongoose';
// import Invoice, { IInvoice } from './invoiceModel'; // Assuming invoiceModel.ts exports IInvoice
// import Product, { IProduct } from './productModel'; // Assuming productModel.ts exports IProduct
// import User, { IUser } from './UserModel';       // Assuming UserModel.ts exports IUser
// import Payment, { IPayment } from './paymentModel'; // Assuming paymentModel.ts exports IPayment

// // --- Interfaces for Nested Objects and Main Document ---

// export interface IPhoneNumber {
//   number: string;
//   type: 'home' | 'mobile' | 'work' | 'other'; // Added 'other' for flexibility
//   primary: boolean;
// }

// export interface IAddress {
//   street: string;
//   city: string;
//   state: string;
//   zipCode: string;
//   country: string;
//   type: 'billing' | 'shipping' | 'home' | 'work';
//   isDefault: boolean;
// }

// export interface ICartItem {
//   productId: Types.ObjectId | IProduct; // Stored as ObjectId, can be populated to IProduct
//   invoiceIds: (Types.ObjectId | IInvoice)[]; // Stored as ObjectId, can be populated to IInvoice
// }

// export interface ICart {
//   items: ICartItem[];
// }

// /**
//  * Interface for the Customer Document.
//  * This extends Mongoose's Document and defines all fields and their types.
//  */
// export interface ICustomer extends Document {
//   owner: Types.ObjectId; // Stored as ObjectId, can be populated to IUser
//   status: 'active' | 'inactive' | 'pending' | 'suspended' | 'blocked';
//   profileImg?: string;
//   email?: string;
//   fullname: string;
//   mobileNumber: string; // Auto-set from primary phone number if available
//   phoneNumbers: IPhoneNumber[];
//   addresses: IAddress[];
//   cart: ICart;
//   guaranteerId?: Types.ObjectId | ICustomer; // Stored as ObjectId, can be populated to ICustomer
//   totalPurchasedAmount: number; // Has a default, so not optional
//   remainingAmount: number;     // Has a default, so not optional
//   paymentHistory: (Types.ObjectId | IPayment)[]; // Stored as ObjectId, can be populated to IPayment
//   metadata: Map<string, any>;
//   createdAt: Date; // Handled by timestamps: true
//   updatedAt: Date; // Handled by timestamps: true
// }

// /**
//  * Interface for the Customer Model.
//  * This extends Mongoose's Model and adds static methods.
//  */
// export interface ICustomerModel extends Model<ICustomer> {
//   /**
//    * Recalculates and updates the remaining amount for a given customer.
//    * Also recalculates totalPurchasedAmount as a prerequisite.
//    * @param {Types.ObjectId} customerId - The ID of the customer to update.
//    * @returns {Promise<ICustomer | null>} The updated customer document or null if not found.
//    */
//   updateRemainingAmount(customerId: Types.ObjectId): Promise<ICustomer | null>;

//   /**
//    * Finds a single customer by query, then recalculates and updates their
//    * total purchased and remaining amounts, and returns the updated customer document.
//    * @param {Record<string, any>} query - The query to find the customer (e.g., { _id: customerId }).
//    * @returns {Promise<ICustomer | null>} The found and updated customer document or null if not found.
//    */
//   getUserWithTotals(query: Record<string, any>): Promise<ICustomer | null>;
// }

// // --- Sub-schemas for Nested Objects ---

// const phoneNumberSchema = new Schema<IPhoneNumber>({
//   number: { type: String, required: true, trim: true },
//   type: { type: String, enum: ['home', 'mobile', 'work', 'other'], default: 'mobile', required: true },
//   primary: { type: Boolean, default: false },
// }, { _id: false }); // No _id for subdocuments unless explicitly needed

// const addressSchema = new Schema<IAddress>({
//   street: { type: String, required: true, trim: true },
//   city: { type: String, required: true, trim: true },
//   state: { type: String, required: true, trim: true },
//   zipCode: { type: String, required: true, trim: true },
//   country: { type: String, required: true, trim: true },
//   type: { type: String, enum: ['billing', 'shipping', 'home', 'work'], default: 'home', required: true },
//   isDefault: { type: Boolean, default: false },
// }, { _id: false });

// const cartItemSchema = new Schema<ICartItem>({
//   productId: { type: Schema.Types.ObjectId, ref: 'Product' },
//   invoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
// }, { _id: false });

// const cartSchema = new Schema<ICart>({
//   items: { type: [cartItemSchema], default: [] },
// }, { _id: false });

// // --- Main Customer Schema Definition ---

// const customerSchema = new Schema<ICustomer, ICustomerModel>({
//   owner: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',
//     required: [true, 'A customer must belong to a user (owner).'],
//   },
//   status: {
//     type: String,
//     enum: ['active', 'inactive', 'pending', 'suspended', 'blocked'],
//     default: 'pending',
//   },
//   profileImg: { type: String },
//   email: {
//     type: String,
//     trim: true,
//     lowercase: true,
//     unique: true,
//     sparse: true, // Allows multiple documents to have null/undefined email
//     match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
//   },
//   fullname: { type: String, required: true, trim: true },
//   mobileNumber: { // This field will be auto-populated from phoneNumbers[0].number
//     type: String,
//     required: [true, 'Mobile number is required'], // Made required because it's auto-set from phoneNumbers
//     trim: true,
//     validate: {
//       validator: function (v: string) {
//         return /^0?[6-9]\d{9}$/.test(v); // Regex for Indian mobile numbers (allows optional '0' prefix)
//       },
//       message: (props: { value: string }) => `${props.value} is not a valid mobile number!`,
//     },
//   },
//   phoneNumbers: {
//     type: [phoneNumberSchema],
//     validate: {
//       validator: function (this: ICustomer, v: IPhoneNumber[]): boolean {
//         return this.guaranteerId ? true : v.length > 0;
//       },
//       message: 'At least one phone number is required unless a guarantor is provided.',
//     },
//   },
//   addresses: { type: [addressSchema], default: [] },
//   cart: { type: cartSchema, default: () => ({ items: [] }) }, // Use a function for default objects
//   guaranteerId: {
//     type: Schema.Types.ObjectId,
//     ref: () => 'Customer', // Lazy reference
//   }, totalPurchasedAmount: { type: Number, default: 0 },
//   remainingAmount: { type: Number, default: 0 },
//   paymentHistory: [{ type: Schema.Types.ObjectId, ref: 'Payment' }],
//   metadata: { type: Map, of: Schema.Types.Mixed, default: () => new Map() }, // Use a function for default Map
// }, {
//   timestamps: true, // Automatically manages `createdAt` and `updatedAt`
//   toJSON: { virtuals: true }, // Include virtuals when converting to JSON
//   toObject: { virtuals: true }, // Include virtuals when converting to Object
// });

// // --- Schema Indexes for Performance ---
// customerSchema.index({ owner: 1 });
// customerSchema.index({ email: 1 }, { unique: true, sparse: true }); // Sparse index for optional unique fields
// customerSchema.index({ mobileNumber: 1, owner: 1 }, { unique: true }); // Prevent duplicate mobile numbers for same owner

// // --- Pre-find Hook for Automatic Population ---
// customerSchema.pre(/^find/, function (this: mongoose.Query<ICustomer, ICustomer>, next) {
//   this.populate([
//     {
//       path: 'cart.items.productId',
//       select: 'title finalPrice thumbnail description name price', // Select specific product fields
//     },
//     {
//       path: 'cart.items.invoiceIds',
//       select: 'invoiceNumber totalAmount invoiceDate status amount date', // Select specific invoice fields
//     },
//     {
//       path: 'paymentHistory',
//       select: 'amount status createdAt transactionId', // Select specific payment fields
//     },
//     {
//       path: 'owner',
//       select: 'name email', // Select specific owner (User) fields
//     },
//     {
//       path: 'guaranteerId',
//       select: 'fullname email mobileNumber', // Select specific guaranteer (Customer) fields
//     }
//   ] as PopulateOptions[]); // Explicitly cast to PopulateOptions[] for type safety
//   next();
// });

// // --- Pre-save Hook ---
// customerSchema.pre<ICustomer>('save', function (next) {
//   // If mobileNumber is not set but phoneNumbers exist, set mobileNumber from the first one
//   if (!this.mobileNumber && this.phoneNumbers && this.phoneNumbers.length > 0) {
//     this.mobileNumber = this.phoneNumbers[0].number;
//   }
//   // `timestamps: true` handles `updatedAt` automatically, no manual update needed here.
//   next();
// });

// // --- Helper Functions (Internal to this module, used by static methods) ---

// /**
//  * Aggregates and returns the total purchased amount for a given customer.
//  * @param {Types.ObjectId} customerId - The ID of the customer.
//  * @returns {Promise<number>} The calculated total purchased amount.
//  */
// // async function calculateTotalPurchasedAmountForCustomer(
// //   customerId: Types.ObjectId
// // ): Promise<number> {
// //   const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer'); // Get the typed model
// //   const aggregationResult = await Customer.aggregate([
// //     { $match: { _id: customerId } },
// //     {
// //       $lookup: {
// //         from: 'invoices', // Mongoose collection name for Invoice model (usually pluralized lowercase)
// //         localField: 'cart.items.invoiceIds',
// //         foreignField: '_id',
// //         as: 'invoices',
// //       },
// //     },
// //     { $unwind: { path: '$invoices', preserveNullAndEmptyArrays: true } }, // Unwind to sum up amounts
// //     {
// //       $group: {
// //         _id: '$_id',
// //         totalAmount: { $sum: { $ifNull: ['$invoices.totalAmount', 0] } },
// //       },
// //     },
// //     { $project: { _id: 0, totalAmount: 1 } },
// //   ]);

// //   return aggregationResult.length > 0 ? (aggregationResult[0].totalAmount || 0) : 0;
// // }
// async function calculateTotalPurchasedAmountForCustomer(customerId: Types.ObjectId): Promise<number> {
//   const invoices = await Invoice.find({ buyer: customerId }, 'totalAmount').lean();
//   return invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
// }
// /**
//  * Calculates the remaining amount based on total purchased and total paid (from populated paymentHistory).
//  * @param {ICustomer} customer - The customer document (with paymentHistory potentially populated).
//  * @returns {Promise<number>} The calculated remaining amount.
//  */
// async function calculateRemainingAmountForCustomer(
//   customer: ICustomer
// ): Promise<number> {
//   // Ensure paymentHistory is populated to access 'amount' for calculation
//   // This cast tells TypeScript that after populate, paymentHistory items will be IPayment.
//   const populatedCustomer = await (customer.populate('paymentHistory', 'amount') as Promise<ICustomer>);

//   // Safely reduce the amounts from the populated payment history
//   const totalPaid = (populatedCustomer.paymentHistory as IPayment[]).reduce((sum, payment) =>
//     sum + (payment.amount || 0), 0);

//   const totalPurchased = customer.totalPurchasedAmount || 0;

//   return Math.max(totalPurchased - totalPaid, 0); // Remaining amount cannot be negative
// }

// // --- Static Method Implementations ---

// customerSchema.statics.updateRemainingAmount = async function (
//   customerId: Types.ObjectId
// ): Promise<ICustomer | null> {
//   try {
//     const customer = await (this as ICustomerModel).findById(customerId);
//     if (!customer) {
//       console.error("Customer not found for static updateRemainingAmount:", customerId);
//       return null;
//     }

//     // 1. Recalculate total purchased amount
//     customer.totalPurchasedAmount = await calculateTotalPurchasedAmountForCustomer(customerId);

//     // 2. Then calculate remaining amount (requires totalPurchasedAmount to be up-to-date)
//     customer.remainingAmount = await calculateRemainingAmountForCustomer(customer);

//     await customer.save(); // Save the updated amounts to the database
//     return customer;
//   } catch (error: unknown) {
//     console.error("Error updating remaining amount (static method):", error instanceof Error ? error.message : error);
//     return null;
//   }
// };

// customerSchema.statics.getUserWithTotals = async function (query: Record<string, any>): Promise<ICustomer | null> {
//   let customer: ICustomer | null = await (this as ICustomerModel).findOne(query);
//   if (!customer) return null;

//   try {
//     // Recalculate totals directly on the found customer instance
//     // Cast customer._id to mongoose.Types.ObjectId for type safety when passing to helper
//     customer.totalPurchasedAmount = await calculateTotalPurchasedAmountForCustomer(customer._id as Types.ObjectId);
//     customer.remainingAmount = await calculateRemainingAmountForCustomer(customer);

//     await customer.save(); // Save the updated amounts to the database

//     // Re-fetch the updated customer with all pre-find populations for consistent return data
//     // Cast customer._id to mongoose.Types.ObjectId for type safety
//     customer = await (this as ICustomerModel).findById(customer._id as Types.ObjectId);
//     return customer;
//   } catch (error: unknown) {
//     console.error("Error in getUserWithTotals:", error instanceof Error ? error.message : error);
//     return null;
//   }
// };

// // --- Create and Export the Customer Model ---
// const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer', customerSchema);
// export default Customer;
// // import mongoose, { Document, Schema, Model, PopulateOptions, Types } from 'mongoose';
// // import Invoice, { IInvoice } from './invoiceModel'; // Assuming invoiceModel.ts exports IInvoice
// // import Product, { IProduct } from './productModel'; // Assuming productModel.ts exports IProduct
// // import User, { IUser } from './UserModel'; // Assuming UserModel.ts exports IUser
// // import Payment, { IPayment } from './paymentModel'; // Assuming you have a Payment model/interface

// // // Interfaces for nested objects
// // export interface IPhoneNumber {
// //   number: string;
// //   type: 'home' | 'mobile' | 'work';
// //   primary: boolean;
// // }

// // export interface IAddress {
// //   street: string;
// //   city: string;
// //   state: string;
// //   zipCode: string;
// //   country: string;
// //   type: 'billing' | 'shipping' | 'home' | 'work';
// //   isDefault: boolean;
// // }

// // // For ICartItem, use Types.ObjectId for the stored ID, and then union with the populated interface.
// // // Mongoose's populate handles the conversion.
// // export interface ICartItem {
// //   productId: Types.ObjectId | IProduct;
// //   invoiceIds: (Types.ObjectId | IInvoice)[];
// // }

// // export interface ICart {
// //   items: ICartItem[];
// // }

// // // Interface for Customer document
// // export interface ICustomer extends Document {
// //   // owner will store ObjectId, but can be populated into IUser
// //   owner: Types.ObjectId | IUser;
// //   // createdAt and updatedAt are automatically managed by { timestamps: true }
// //   // Do not define them explicitly in the interface if you want them managed by Mongoose
// //   // If you want them in your interface for typing, Mongoose will still manage them.
// //   createdAt: Date;
// //   updatedAt: Date;
// //   status: 'active' | 'inactive' | 'pending' | 'suspended' | 'blocked';
// //   profileImg?: string;
// //   email?: string;
// //   fullname: string;
// //   mobileNumber: string;
// //   phoneNumbers: IPhoneNumber[];
// //   addresses: IAddress[];
// //   cart: ICart;
// //   guaranteerId?: Types.ObjectId | ICustomer; // Can be ObjectId or populated Customer
// //   totalPurchasedAmount: number; // Removed '?' as it has a default, making it always present
// //   remainingAmount: number; // Removed '?' as it has a default, making it always present
// //   paymentHistory: (Types.ObjectId | IPayment)[]; // Can be ObjectId or populated Payment
// //   metadata: Map<string, any>;
// // }

// // // Interface for Customer model with static methods
// // // Methods directly on the document should be in ICustomer.
// // // Statics are methods on the Model itself.
// // export interface ICustomerModel extends Model<ICustomer> {
// //   updateRemainingAmount(customerId: Types.ObjectId): Promise<ICustomer | null>;
// //   getUserWithTotals(query: Record<string, any>): Promise<ICustomer | null>;
// //   // Add an instance method for calculating amounts if preferred
// //   // calculateTotals(): Promise<void>;
// // }

// // // Sub-schemas for nested objects
// // const phoneNumberSchema = new Schema<IPhoneNumber>({
// //   number: { type: String, required: true, trim: true },
// //   type: { type: String, enum: ['home', 'mobile', 'work'], required: true },
// //   primary: { type: Boolean, default: false },
// // }, { _id: false }); // No _id for subdocuments unless explicitly needed

// // const addressSchema = new Schema<IAddress>({
// //   street: { type: String, required: true, trim: true },
// //   city: { type: String, required: true, trim: true },
// //   state: { type: String, required: true, trim: true },
// //   zipCode: { type: String, required: true, trim: true },
// //   country: { type: String, required: true, trim: true },
// //   type: { type: String, enum: ['billing', 'shipping', 'home', 'work'], required: true },
// //   isDefault: { type: Boolean, default: false },
// // }, { _id: false }); // No _id for subdocuments unless explicitly needed

// // const cartItemSchema = new Schema<ICartItem>({
// //   productId: { type: Schema.Types.ObjectId, ref: 'Product' },
// //   invoiceIds: [{ type: Schema.Types.ObjectId, ref: 'Invoice' }],
// // }, { _id: false }); // No _id for subdocuments unless explicitly needed

// // const cartSchema = new Schema<ICart>({
// //   items: { type: [cartItemSchema], default: [] },
// // }, { _id: false }); // No _id for subdocuments unless explicitly needed

// // const customerSchema = new Schema<ICustomer, ICustomerModel>({
// //   owner: {
// //     type: Schema.Types.ObjectId,
// //     ref: 'User',
// //     required: [true, 'A customer must belong to a user (owner).'],
// //   },
// //   // createdAt and updatedAt handled by timestamps: true below
// //   status: {
// //     type: String,
// //     enum: ['active', 'inactive', 'pending', 'suspended', 'blocked'],
// //     default: 'pending',
// //   },
// //   profileImg: { type: String },
// //   email: {
// //     type: String,
// //     unique: true,
// //     sparse: true, // Allow multiple nulls/undefined for email
// //     match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address'],
// //   },
// //   fullname: { type: String, required: true, trim: true },
// //   mobileNumber: {
// //     type: String,
// //     required: true,
// //     trim: true,
// //     validate: {
// //       validator: function (v: string) {
// //         return /^0?[6-9]\d{9}$/.test(v); // Updated regex for Indian numbers (allows optional 0 prefix)
// //       },
// //       message: (props: { value: string }) => `${props.value} is not a valid mobile number!`,
// //     },
// //   },
// //   phoneNumbers: {
// //     type: [phoneNumberSchema],
// //     validate: {
// //       validator: function (this: ICustomer, v: IPhoneNumber[]): boolean {
// //         // If there's no guaranteerId, at least one phone number is required.
// //         // If there is a guaranteerId, phone numbers are optional.
// //         return !this.guaranteerId ? (Array.isArray(v) && v.length > 0) : true;
// //       },
// //       message: 'At least one phone number is required if no guaranteer is provided.',
// //     },
// //   },
// //   addresses: { type: [addressSchema], default: [] },
// //   cart: { type: cartSchema, default: () => ({ items: [] }) }, // Ensure default creates a new object
// //   guaranteerId: { type: Schema.Types.ObjectId, ref: 'Customer' }, // No required: false needed, it's default
// //   totalPurchasedAmount: { type: Number, default: 0 },
// //   remainingAmount: { type: Number, default: 0 },
// //   paymentHistory: [{ type: Schema.Types.ObjectId, ref: 'Payment' }],
// //   metadata: { type: Map, of: Schema.Types.Mixed, default: () => new Map() }, // Ensure default creates new Map
// // }, {
// //   timestamps: true, // Automatically manages createdAt and updatedAt
// //   toJSON: { virtuals: true },
// //   toObject: { virtuals: true },
// // });

// // // Indexes for performance
// // customerSchema.index({ owner: 1 });
// // customerSchema.index({ email: 1 }, { unique: true, sparse: true }); // Ensure sparse for unique on optional field
// // customerSchema.index({ mobileNumber: 1, owner: 1 }, { unique: true }); // Prevent duplicate mobile numbers for same owner

// // // Consolidated pre-find hook for population
// // customerSchema.pre(/^find/, function (this: mongoose.Query<ICustomer, ICustomer>, next) {
// //   this.populate([
// //     {
// //       path: 'cart.items.productId',
// //       select: 'title finalPrice thumbnail description name price',
// //     },
// //     {
// //       path: 'cart.items.invoiceIds',
// //       select: 'invoiceNumber totalAmount invoiceDate status amount date',
// //     },
// //     {
// //       path: 'paymentHistory',
// //       // Explicitly cast the populated type for 'paymentHistory'
// //       // This helps TypeScript understand the shape when you later access `payment.amount`
// //       select: 'amount status createdAt transactionId',
// //     },
// //     {
// //       path: 'owner',
// //       select: 'name email',
// //     },
// //     {
// //       path: 'guaranteerId',
// //       select: 'fullname email mobileNumber',
// //     }
// //   ] as PopulateOptions[]); // Explicitly cast to PopulateOptions[] for type safety
// //   next();
// // });

// // // Pre-save hook: Set mobileNumber if phoneNumbers exist and mobileNumber is not set
// // customerSchema.pre<ICustomer>('save', function (next) {
// //   // 'timestamps: true' handles updatedAt, so no manual update needed here
// //   if (!this.mobileNumber && this.phoneNumbers && this.phoneNumbers.length > 0) {
// //     this.mobileNumber = this.phoneNumbers[0].number;
// //   }
// //   next();
// // });

// // // --- Helper Functions (made private to the module or directly integrated as methods/statics) ---

// // // This function will now be called by statics/methods, it needs to get the Customer model itself
// // async function calculateTotalPurchasedAmountForCustomer(
// //   customerId: Types.ObjectId
// // ): Promise<number> {
// //   const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer');
// //   const aggregationResult = await Customer.aggregate([
// //     { $match: { _id: customerId } },
// //     {
// //       $lookup: {
// //         from: 'invoices', // Collection name for Invoice model
// //         localField: 'cart.items.invoiceIds',
// //         foreignField: '_id',
// //         as: 'invoices',
// //       },
// //     },
// //     { $unwind: { path: '$invoices', preserveNullAndEmptyArrays: true } },
// //     {
// //       $group: {
// //         _id: '$_id',
// //         totalAmount: { $sum: { $ifNull: ['$invoices.totalAmount', 0] } },
// //       },
// //     },
// //     { $project: { _id: 0, totalAmount: 1 } },
// //   ]);

// //   return aggregationResult.length > 0 ? (aggregationResult[0].totalAmount || 0) : 0;
// // }

// // async function calculateRemainingAmountForCustomer(
// //   customer: ICustomer
// // ): Promise<number> {
// //   // If paymentHistory is populated, its items will be IPayment documents
// //   // If not populated, it will be an array of ObjectIds.
// //   // We need to ensure it's populated for this calculation.
// //   // This function assumes paymentHistory is already populated if it's called on a fetched document.
// //   // If calling this function standalone, you'd need to populate it first.
// //   const populatedCustomer = await (customer.populate('paymentHistory', 'amount') as Promise<ICustomer>);


// //   // Safely access amount:
// //   const totalPaid = (populatedCustomer.paymentHistory as IPayment[]).reduce((sum, payment) =>
// //     sum + (payment.amount || 0), 0);

// //   const totalPurchased = customer.totalPurchasedAmount || 0;

// //   return Math.max(totalPurchased - totalPaid, 0);
// // }


// // // --- Static method implementations ---

// // customerSchema.statics.updateRemainingAmount = async function (
// //   customerId: Types.ObjectId
// // ): Promise<ICustomer | null> {
// //   try {
// //     const customer = await (this as ICustomerModel).findById(customerId);
// //     if (!customer) {
// //       console.error("Customer not found for static updateRemainingAmount");
// //       return null;
// //     }

// //     // Recalculate total purchased amount first
// //     customer.totalPurchasedAmount = await calculateTotalPurchasedAmountForCustomer(customerId);

// //     // Then calculate remaining amount
// //     customer.remainingAmount = await calculateRemainingAmountForCustomer(customer);

// //     await customer.save();
// //     return customer;
// //   } catch (error: unknown) {
// //     console.error("Error updating remaining amount (static method):", error instanceof Error ? error.message : error);
// //     return null;
// //   }
// // };

// // customerSchema.statics.getUserWithTotals = async function (query: Record<string, any>): Promise<ICustomer | null> {
// //   let customer: ICustomer | null = await (this as ICustomerModel).findOne(query);
// //   if (!customer) return null;

// //   // Recalculate totals directly on the found customer instance
// //   customer.totalPurchasedAmount = await calculateTotalPurchasedAmountForCustomer(customer._id);
// //   customer.remainingAmount = await calculateRemainingAmountForCustomer(customer);

// //   await customer.save(); // Save the updated amounts

// //   // Re-fetch the updated customer with all populations (or you can just return the current one
// //   // if you don't need full re-population of previous pre-find hooks).
// //   // For consistency with pre(/^find/), we'll re-fetch.
// //   customer = await (this as ICustomerModel).findById(customer._id);
// //   return customer;
// // };

// // // Create the Mongoose model
// // const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer', customerSchema);
// // export default Customer;
// // // import mongoose, { Document, Schema, Model, PopulateOptions } from 'mongoose';
// // // import Invoice, { IInvoice } from './invoiceModel'; // Assuming invoiceModel.ts exports IInvoice
// // // import Product, { IProduct } from './productModel'; // Assuming productModel.ts exports IProduct
// // // import User, { IUser } from './UserModel'; // Assuming UserModel.ts exports IUser

// // // // Interfaces for nested objects
// // // export interface IPhoneNumber {
// // //   number: string;
// // //   type: 'home' | 'mobile' | 'work';
// // //   primary: boolean;
// // // }

// // // export interface IAddress {
// // //   street: string;
// // //   city: string;
// // //   state: string;
// // //   zipCode: string;
// // //   country: string;
// // //   type: 'billing' | 'shipping' | 'home' | 'work';
// // //   isDefault: boolean;
// // // }

// // // export interface ICartItem {
// // //   productId: mongoose.Types.ObjectId | IProduct; // Can be ObjectId or populated Product
// // //   invoiceIds: (mongoose.Types.ObjectId | IInvoice)[]; // Can be ObjectId or populated Invoice
// // // }

// // // export interface ICart {
// // //   items: ICartItem[];
// // // }

// // // // Interface for Customer document
// // // export interface ICustomer extends Document {
// // //   owner: mongoose.Types.ObjectId | IUser;
// // //   createdAt: Date;
// // //   updatedAt: Date;
// // //   status: 'active' | 'inactive' | 'pending' | 'suspended' | 'blocked';
// // //   profileImg?: string;
// // //   email?: string;
// // //   fullname: string;
// // //   mobileNumber: string;
// // //   phoneNumbers: IPhoneNumber[];
// // //   addresses: IAddress[];
// // //   cart: ICart;
// // //   guaranteerId?: mongoose.Types.ObjectId | ICustomer;
// // //   totalPurchasedAmount?: number;
// // //   remainingAmount: number;
// // //   paymentHistory: mongoose.Types.ObjectId[]; // This will be populated as IPayment[] later
// // //   metadata: Map<string, any>;
// // // }

// // // // Interface for Customer model with static methods
// // // export interface ICustomerModel extends Model<ICustomer> {
// // //   updateRemainingAmount(customerId: mongoose.Types.ObjectId): Promise<ICustomer | null>;
// // //   getUserWithTotals(query: Record<string, any>): Promise<ICustomer | null>;
// // // }

// // // const customerSchema = new Schema<ICustomer>({
// // //   // owner: {
// // //   //   type: mongoose.Schema.Types.ObjectId,
// // //   //   ref: 'User',
// // //   //   required: true,
// // //   // },
// // //   owner: {
// // //     type: Schema.Types.ObjectId,
// // //     ref: 'User', // Reference to your User model
// // //     required: [true, 'A customer must belong to a user (owner).'],
// // //   },
// // //   createdAt: { type: Date, required: true, default: Date.now },
// // //   updatedAt: { type: Date, required: true, default: Date.now },
// // //   status: {
// // //     type: String,
// // //     enum: ['active', 'inactive', 'pending', 'suspended', 'blocked'],
// // //     default: 'pending',
// // //   },
// // //   profileImg: { type: String },
// // //   email: { type: String, unique: true, match: /.+\@.+\..+/ },
// // //   fullname: { type: String, required: true },
// // //   mobileNumber: {
// // //     type: String,
// // //     required: true,
// // //     validate: {
// // //       validator: function (v: string) {
// // //         return /^0?[6-9]\d{9}$/.test(v); // Updated regex
// // //       },
// // //       message: (props: { value: string }) => `${props.value} is not a valid mobile number!`,
// // //     },
// // //   },
// // //   phoneNumbers: {
// // //     type: [
// // //       {
// // //         number: { type: String, required: true },
// // //         type: { type: String, enum: ['home', 'mobile', 'work'], required: true },
// // //         primary: { type: Boolean, default: false },
// // //       },
// // //     ],
// // //     validate: {
// // //       validator: function (this: ICustomer, v: IPhoneNumber[]) {
// // //         if (!this.guaranteerId) {
// // //           return Array.isArray(v) && v.length > 0;
// // //         }
// // //         return true;
// // //       },
// // //       message: 'Phone number is required if no guaranteer is provided.',
// // //     },
// // //   },
// // //   addresses: [
// // //     {
// // //       street: { type: String, required: true },
// // //       city: { type: String, required: true },
// // //       state: { type: String, required: true },
// // //       zipCode: { type: String, required: true },
// // //       country: { type: String, required: true },
// // //       type: { type: String, enum: ['billing', 'shipping', 'home', 'work'], required: true },
// // //       isDefault: { type: Boolean, default: false },
// // //     },
// // //   ],
// // //   cart: {
// // //     items: [
// // //       {
// // //         productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
// // //         invoiceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
// // //       },
// // //     ],
// // //   },
// // //   guaranteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: false },
// // //   totalPurchasedAmount: { type: Number, default: 0 }, // Added default
// // //   remainingAmount: { type: Number, default: 0 },
// // //   paymentHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }], // Refers to Payment model
// // //   metadata: { type: Map, of: Schema.Types.Mixed },
// // // }, { timestamps: true });

// // // // Consolidated pre-find hook for population
// // // customerSchema.pre(/^find/, function (this: mongoose.Query<ICustomer, ICustomer>, next) {
// // //   this.populate([
// // //     {
// // //       path: 'cart.items.productId',
// // //       select: 'title finalPrice thumbnail description name price',
// // //     },
// // //     {
// // //       path: 'cart.items.invoiceIds',
// // //       select: 'invoiceNumber totalAmount invoiceDate status amount date',
// // //     },
// // //     {
// // //       path: 'paymentHistory',
// // //       select: 'amount status createdAt transactionId',
// // //     },
// // //     {
// // //       path: 'owner',
// // //       select: 'name email',
// // //     },
// // //     {
// // //       path: 'guaranteerId',
// // //       select: 'fullname email mobileNumber',
// // //     }
// // //   ] as PopulateOptions[]); // Explicitly cast to PopulateOptions[]
// // //   next();
// // // });

// // // // Helper function definitions (moved outside schema for clarity, but could be statics)
// // // // These functions use `mongoose.model('Customer')` which correctly resolves to the typed model
// // // async function calculateTotalPurchasedAmount(customerId: mongoose.Types.ObjectId): Promise<void> {
// // //   try {
// // //     const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer');
// // //     const customer = await Customer.findById(customerId);
// // //     if (!customer) {
// // //       console.error("Customer not found for total purchased amount calculation");
// // //       return;
// // //     }
// // //     const aggregationResult = await Customer.aggregate([
// // //       { $match: { _id: customer._id } },
// // //       {
// // //         $lookup: {
// // //           from: 'invoices', // Collection name for Invoice model
// // //           localField: 'cart.items.invoiceIds',
// // //           foreignField: '_id',
// // //           as: 'invoices',
// // //         },
// // //       },
// // //       { $unwind: { path: '$invoices', preserveNullAndEmptyArrays: true } },
// // //       {
// // //         $group: {
// // //           _id: '$_id',
// // //           totalAmount: { $sum: { $ifNull: ['$invoices.totalAmount', 0] } },
// // //         },
// // //       },
// // //       { $project: { _id: 0, totalAmount: 1 } },
// // //     ]);
// // //     let totalPurchasedAmount = 0;
// // //     if (aggregationResult.length > 0) {
// // //       totalPurchasedAmount = aggregationResult[0].totalAmount || 0;
// // //     }
// // //     customer.totalPurchasedAmount = totalPurchasedAmount;
// // //     await customer.save();
// // //   } catch (error: unknown) {
// // //     console.error("Error calculating total purchased amount:", error instanceof Error ? error.message : error);
// // //   }
// // // }

// // // async function calculateRemainingAmount(customerId: mongoose.Types.ObjectId): Promise<void> {
// // //   try {
// // //     const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer');
// // //     // Populate paymentHistory to access 'amount' directly
// // //     const customer = await Customer.findById(customerId).populate('paymentHistory', 'amount');
// // //     if (!customer) {
// // //       console.log("Customer not found for remaining amount calculation");
// // //       return;
// // //     }

// // //     // Ensure paymentHistory is an array and safe to iterate
// // //     const totalPaid = (customer.paymentHistory as unknown as Array<{ amount: number }>).reduce((sum, payment) => sum + (payment.amount || 0), 0);

// // //     const totalPurchased = customer.totalPurchasedAmount || 0;

// // //     customer.remainingAmount = Math.max(totalPurchased - totalPaid, 0);
// // //     await customer.save();
// // //   } catch (err: unknown) {
// // //     console.error("Error calculating remaining amount:", err instanceof Error ? err.message : err);
// // //   }
// // // }

// // // customerSchema.pre<ICustomer>('save', function (next) {
// // //   if (this.phoneNumbers && this.phoneNumbers.length > 0 && !this.mobileNumber) {
// // //     this.mobileNumber = this.phoneNumbers[0].number;
// // //   }
// // //   this.updatedAt = new Date(); // Manually update updatedAt as timestamps might not trigger for subdocuments
// // //   next();
// // // });

// // // // Static method implementation
// // // customerSchema.statics.updateRemainingAmount = async function (
// // //   customerId: mongoose.Types.ObjectId
// // // ): Promise<ICustomer | null> {
// // //   try {
// // //     // We already have Customer as ICustomerModel, so directly use this.findById
// // //     const customer = await (this as ICustomerModel).findById(customerId).populate('paymentHistory', 'amount');
// // //     if (!customer) {
// // //       console.error("Customer not found for static updateRemainingAmount");
// // //       return null;
// // //     }

// // //     const totalPaid = (customer.paymentHistory as unknown as Array<{ amount: number }>).reduce(
// // //       (sum: number, payment: { amount: number }) => sum + (payment.amount || 0),
// // //       0
// // //     );

// // //     const totalPurchased = customer.totalPurchasedAmount || 0;

// // //     customer.remainingAmount = Math.max(totalPurchased - totalPaid, 0);

// // //     await customer.save();
// // //     return customer;
// // //   } catch (error: unknown) {
// // //     console.error("Error updating remaining amount (static method):", error instanceof Error ? error.message : error);
// // //     return null;
// // //   }
// // // };

// // // customerSchema.statics.getUserWithTotals = async function (query: Record<string, any>): Promise<ICustomer | null> {
// // //   // Find the user using the typed model
// // //   let user: ICustomer | null = await (this as ICustomerModel).findOne(query);
// // //   if (!user) return null;

// // //   // Explicitly recalculate totals
// // //   // Fix: Cast user._id to mongoose.Types.ObjectId
// // //   await calculateTotalPurchasedAmount(user._id as mongoose.Types.ObjectId);
// // //   await calculateRemainingAmount(user._id as mongoose.Types.ObjectId);

// // //   // Re-fetch the updated user with population
// // //   user = await (this as ICustomerModel).findById(user._id);
// // //   return user;
// // // };

// // // const Customer = mongoose.model<ICustomer, ICustomerModel>('Customer', customerSchema);
// // // export default Customer;