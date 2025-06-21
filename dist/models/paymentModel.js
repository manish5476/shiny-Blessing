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
const customerModel_1 = __importDefault(require("./customerModel"));
const paymentSchema = new mongoose_1.Schema({
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Customer',
        required: [true, 'Customer is required'],
        index: true, // For customer-based queries
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required'],
        min: [0, 'Amount cannot be negative'],
    },
    paymentDate: {
        type: Date,
        default: Date.now,
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'card', 'upi', 'netbanking'],
        required: [true, 'Payment method is required'],
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending',
    },
    transactionId: String,
    metadata: {
        type: mongoose_1.Schema.Types.Mixed, // Typed with IPaymentMetadata
        default: {},
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Static method to calculate remaining amount
paymentSchema.statics.calculateRemainingAmountForCustomer = async function (customerId) {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const customer = await customerModel_1.default.findById(customerId)
            .populate('paymentHistory', 'amount')
            .session(session);
        if (!customer) {
            throw new Error(`Customer with ID ${customerId} not found`);
        }
        const totalPaid = customer.paymentHistory.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        customer.remainingAmount = Math.max(customer.totalPurchasedAmount || 0 - totalPaid, 0);
        await customer.save({ session });
        await session.commitTransaction();
    }
    catch (err) {
        await session.abortTransaction();
        throw err instanceof Error ? err : new Error('Unknown error during remaining amount calculation');
    }
    finally {
        session.endSession();
    }
};
// Post-save middleware to update customer remaining amount
paymentSchema.post('save', async function (doc) {
    await this.constructor.calculateRemainingAmountForCustomer(doc.customer);
});
// Create and export the Payment model
const Payment = mongoose_1.default.model('Payment', paymentSchema);
exports.default = Payment;
// import mongoose, { Schema, Document, Model, PopulateOptions } from 'mongoose';
// import Customer, { ICustomer, ICustomerModel } from './customerModel'; // Import ICustomerModel by name
// import User, { IUser } from './UserModel'; // Assuming UserModel.ts exports IUser
// // Define an interface for the Payment Document
// export interface IPayment extends Document {
//   owner: mongoose.Types.ObjectId | IUser;
//   amount: number;
//   paymentMethod: 'credit_card' | 'debit_card' | 'upi' | 'crypto' | 'bank_transfer';
//   status: 'pending' | 'completed' | 'failed' | 'refunded';
//   transactionId?: string; // Optional, as it's generated in pre-save
//   createdAt: Date;
//   updatedAt: Date;
//   customerId: mongoose.Types.ObjectId | ICustomer;
//   customerName?: string;
//   phoneNumbers?: string;
//   metadata: Record<string, any>; // Use Record<string, any> for mixed types
//   description?: string;
// }
// // Define an interface for the Payment Model (if you have static methods)
// export interface IPaymentModel extends Model<IPayment> {
//   // Add any static methods here if you have them
// }
// const paymentSchema = new Schema<IPayment>({
//   owner: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   amount: {
//     type: Number,
//     required: [true, 'Amount is required'],
//     min: [0, 'Amount cannot be negative'],
//   },
//   paymentMethod: {
//     type: String,
//     required: true,
//     enum: ['credit_card', 'debit_card', 'upi', 'crypto', 'bank_transfer'],
//   },
//   status: {
//     type: String,
//     default: 'pending',
//     enum: ['pending', 'completed', 'failed', 'refunded'],
//   },
//   transactionId: {
//     type: String,
//     unique: true,
//     sparse: true, // Only one payment should have this transaction ID
//   },
//   customerId: { // Reference to the Customer schema
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Customer',
//     required: true,
//   },
//   customerName: {
//     type: String,
//   },
//   phoneNumbers: {
//     type: String,
//   },
//   metadata: {
//     type: Schema.Types.Mixed,
//     default: {},
//   },
//   description: {
//     type: String,
//     maxlength: 200,
//   },
// }, {
//   timestamps: true, // Automatically manage createdAt and updatedAt
// });
// paymentSchema.pre<IPayment>('save', function (next) {
//   if (!this.transactionId) {
//     this.transactionId = `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
//   }
//   this.updatedAt = new Date(); // Ensure updatedAt is updated if not using `timestamps: true` or if modifying it
//   next();
// });
// // Helper function to calculate remaining amount (extracted to avoid duplication)
// async function calculateRemainingAmountForCustomer(customerId: mongoose.Types.ObjectId): Promise<void> {
//     try {
//         // Lazily import the Customer model to avoid circular dependencies if Customer also imports Payment
//         const CustomerModule = await import('./customerModel');
//         const CustomerModel: ICustomerModel = CustomerModule.default as ICustomerModel;
//         // Perform the query and population
//         const queryResult = await CustomerModel.findById(customerId).populate('paymentHistory', 'amount');
//         // Explicitly cast the queryResult to the desired populated type
//         const customer = queryResult as (ICustomer & { paymentHistory: IPayment[] }) | null;
//         if (!customer) {
//             console.warn(`[Payment Model] Customer with ID ${customerId} not found for remaining amount calculation.`);
//             return;
//         }
//         let totalPaid = 0;
//         // Ensure paymentHistory is an array and iterate over populated Payment documents
//         if (customer.paymentHistory && Array.isArray(customer.paymentHistory)) {
//             // Explicitly type 'payment' as IPayment
//             customer.paymentHistory.forEach((payment: IPayment) => {
//                 totalPaid += payment.amount || 0; // Sum amounts from populated payment documents
//             });
//         }
//         // Ensure totalPurchasedAmount is a number, default to 0 if undefined
//         const totalPurchased = customer.totalPurchasedAmount || 0;
//         customer.remainingAmount = Math.max(totalPurchased - totalPaid, 0); // Ensure non-negative
//         await customer.save();
//     } catch (err: unknown) {
//         console.error(`[Payment Model] Error calculating remaining amount for customer ${customerId}:`, err instanceof Error ? err.message : err);
//     }
// }
// // Post-save Hook to push payment data to the customer's paymentHistory array
// paymentSchema.post<IPayment>('save', async function (doc) {
//   try {
//     // Lazily import the Customer model to avoid circular dependencies
//     const CustomerModule = await import('./customerModel');
//     const CustomerModel: ICustomerModel = CustomerModule.default as ICustomerModel; // Assert as ICustomerModel
//     const customer = await CustomerModel.findById(doc.customerId);
//     if (!customer) {
//       console.warn(`[Payment Post-Save] Customer with ID ${doc.customerId} not found.`);
//       return;
//     }
//     // Check if the payment already exists in paymentHistory to avoid duplicates
//     // Cast doc._id to mongoose.Types.ObjectId explicitly for includes method
//     if (!customer.paymentHistory.includes(doc._id as mongoose.Types.ObjectId)) {
//         customer.paymentHistory.push(doc._id as mongoose.Types.ObjectId);
//     }
//     // Call the helper function to update remaining amount
//     await calculateRemainingAmountForCustomer(doc.customerId as mongoose.Types.ObjectId); // Cast to ObjectId
//     // No need to call customer.save() here as calculateRemainingAmountForCustomer already saves it
//   } catch (error: unknown) {
//     console.error("[Payment Post-Save] Error in post-save hook:", error instanceof Error ? error.message : error);
//   }
// });
// // Pre-find hook for population (optional, but good practice if you often populate these)
// paymentSchema.pre(/^find/, function (this: mongoose.Query<IPayment, IPayment>, next) {
//     this.populate([
//         { path: 'owner', select: 'name email' },
//         { path: 'customerId', select: 'fullname email mobileNumber' }
//     ] as PopulateOptions[]);
//     next();
// });
// const Payment = mongoose.model<IPayment, IPaymentModel>('Payment', paymentSchema);
// export default Payment;
//# sourceMappingURL=paymentModel.js.map