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
const reviewSchema = new mongoose_1.Schema({
    rating: {
        type: Number,
        required: [true, 'Rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating must be at most 5'],
    },
    review: {
        type: String,
        required: [true, 'Review text is required'],
        trim: true,
    },
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required'],
        index: true, // For product-based queries
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User is required'],
        index: true, // For user-based queries
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// Static method to calculate average rating
reviewSchema.statics.calcAverageRating = async function (productId, session = null) {
    const options = session ? { session } : {};
    const stats = await this.aggregate([
        { $match: { product: productId } },
        {
            $group: {
                _id: '$product',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' },
            },
        },
    ], options);
    const updateData = stats.length > 0
        ? {
            ratingAverage: stats[0].avgRating,
            ratingQuantity: stats[0].nRating,
        }
        : { ratingAverage: 0, ratingQuantity: 0 };
    await productModel_1.default.findByIdAndUpdate(productId, updateData, options);
};
// Middleware to update average rating after save (document middleware)
reviewSchema.post('save', async function (doc) {
    const existingSession = this.$session() || null;
    const sessionStartedHere = !existingSession;
    const session = existingSession || (await mongoose_1.default.startSession());
    try {
        const productIdToPass = doc.product instanceof mongoose_1.default.Types.ObjectId
            ? doc.product
            // If doc.product is IProduct, extract _id and cast it to ObjectId
            : doc.product._id;
        if (sessionStartedHere) {
            await session.withTransaction(async () => {
                await this.constructor.calcAverageRating(productIdToPass, session);
            });
        }
        else {
            await this.constructor.calcAverageRating(productIdToPass, session);
        }
    }
    catch (error) {
        throw new mongoose_1.default.Error(`Failed to update product ratings after save: ${error instanceof Error ? error.message : String(error)}`);
    }
    finally {
        if (sessionStartedHere)
            session.endSession();
    }
});
// Middleware to update average rating after update or delete (query middleware)
reviewSchema.post(/^findOneAnd/, async function (doc) {
    if (!doc)
        return;
    const existingSession = this.options?.session || null;
    const sessionStartedHere = !existingSession;
    const session = existingSession || (await mongoose_1.default.startSession());
    try {
        const productIdToPass = doc.product instanceof mongoose_1.default.Types.ObjectId
            ? doc.product
            // If doc.product is IProduct, extract _id and cast it to ObjectId
            : doc.product._id;
        if (sessionStartedHere) {
            await session.withTransaction(async () => {
                await this.model.calcAverageRating(productIdToPass, session);
            });
        }
        else {
            await this.model.calcAverageRating(productIdToPass, session);
        }
    }
    catch (error) {
        throw new mongoose_1.default.Error(`Failed to update product ratings after update/delete: ${error instanceof Error ? error.message : String(error)}`);
    }
    finally {
        if (sessionStartedHere)
            session.endSession();
    }
});
// Create and export the Review model
const Review = mongoose_1.default.model('Review', reviewSchema);
exports.default = Review;
// import mongoose, { Schema, Document, Model, Query, PopulateOptions, ClientSession } from 'mongoose';
// import Product, { IProduct } from './productModel';
// import User, { IUser } from './UserModel';
// // 1. Define Interface for Review Document
// export interface IReview extends Document {
//   user: mongoose.Types.ObjectId | IUser;
//   owner: mongoose.Types.ObjectId | IUser;
//   product: mongoose.Types.ObjectId | IProduct;
//   rating: number;
//   userreview: string;
//   createdAt: Date;
//   updatedAt: Date;
// }
// // 2. Define Interface for Review Model with static methods
// export interface IReviewModel extends Model<IReview> {
//   calcAverageRating(productId: mongoose.Types.ObjectId, session?: mongoose.ClientSession | null): Promise<void>;
// }
// const reviewSchema = new mongoose.Schema<IReview>({
//   user: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: [true, 'A review must be given by a User'],
//   },
//   owner: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true,
//   },
//   product: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Product',
//     required: [true, 'A review must belong to a Product'],
//   },
//   rating: {
//     type: Number,
//     min: [1, 'Rating must be at least 1'],
//     max: [5, 'Rating cannot exceed 5'],
//     required: true,
//   },
//   userreview: {
//     type: String,
//     required: [true, 'Review text is required'],
//     trim: true,
//   },
// }, {
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true },
//   timestamps: true,
// });
// // Unique index to prevent duplicate reviews per user-product pair
// reviewSchema.index({ product: 1, user: 1 }, { unique: true });
// // Static method to calculate average rating (and quantity) for a product
// reviewSchema.statics.calcAverageRating = async function (
//   productId: mongoose.Types.ObjectId,
//   session: mongoose.ClientSession | null = null
// ): Promise<void> {
//   const options = session ? { session } : {};
//   const stats = await (this as IReviewModel).aggregate([
//     { $match: { product: productId } },
//     {
//       $group: {
//         _id: '$product',
//         nRating: { $sum: 1 },
//         avgRating: { $avg: '$rating' },
//       },
//     },
//   ], options);
//   let updateData: { ratingAverage: number; ratingQuantity: number };
//   if (stats.length > 0) {
//     updateData = {
//       ratingAverage: stats[0].avgRating,
//       ratingQuantity: stats[0].nRating,
//     };
//   } else {
//     updateData = { ratingAverage: 0, ratingQuantity: 0 };
//   }
//   const ProductModel = await import('./productModel').then(m => m.default) as Model<IProduct>;
//   await ProductModel.findByIdAndUpdate(productId, updateData, options);
// };
// // Populate user and product data before any find query
// reviewSchema.pre(/^find/, function (this: Query<IReview | IReview[], IReview>, next) {
//   this.populate([
//     {
//       path: 'user',
//       select: 'name email',
//     },
//     {
//       path: 'product',
//       select: 'title',
//     },
//     {
//       path: 'owner',
//       select: 'name email',
//     }
//   ] as PopulateOptions[]);
//   next();
// });
// // Post-save hook to recalculate product ratings after a new review is saved
// reviewSchema.post<IReview>('save', async function (doc) {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     await (this.constructor as IReviewModel).calcAverageRating(doc.product as mongoose.Types.ObjectId, session);
//     await session.commitTransaction();
//   } catch (error: unknown) {
//     await session.abortTransaction();
//     throw new mongoose.Error(`Failed to update product ratings after save: ${error instanceof Error ? error.message : String(error)}`);
//   } finally {
//     session.endSession();
//   }
// });
// // Define a type for the query context to allow the `r` property
// // IMPORTANT: Do NOT define `session` here, as it's a method on Query.
// interface ReviewQuery extends Query<IReview | null, IReview> {
//   r?: IReview | null; // Optional property to store the found document
//   options?: { session?: ClientSession }; // Add options property to access session
// }
// reviewSchema.pre<ReviewQuery>(/^findOneAnd/, async function (next) {
//   const currentQuerySession: ClientSession | undefined = this.options?.session;
//   this.r = await this.model.findOne(this.getFilter()).session(currentQuerySession || null);
//   next();
// });
// reviewSchema.post<ReviewQuery>(/^findOneAnd/, async function (doc, next) {
//   if (this.r) {
//     const session = await mongoose.startSession();
//     session.startTransaction();
//     try {
//       await (this.r.constructor as IReviewModel).calcAverageRating(this.r.product as mongoose.Types.ObjectId, session);
//       await session.commitTransaction();
//     } catch (error: unknown) {
//       await session.abortTransaction();
//       throw new mongoose.Error(`Failed to update product ratings after findOneAnd: ${error instanceof Error ? error.message : String(error)}`);
//     } finally {
//       session.endSession();
//     }
//   }
// });
// const Review = mongoose.model<IReview, IReviewModel>('Review', reviewSchema);
// export default Review;
//# sourceMappingURL=ReviewModel.js.map