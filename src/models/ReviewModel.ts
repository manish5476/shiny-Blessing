import mongoose, { Schema, Document, Model, Query, PopulateOptions } from 'mongoose';
import Product, { IProduct } from './productModel';
import { ClientSession } from 'mongoose'; // Explicitly import ClientSession

// Interface for Review document
export interface IReview extends Document {
  rating: number;
  review: string;
  product: mongoose.Types.ObjectId | IProduct; // Can be populated
  user: mongoose.Types.ObjectId;
  createdAt: Date;
}

// Interface for Review query (used for 'this' context in query middleware)
// Using 'any' for the first type parameter of Query to allow flexibility with document types
interface ReviewQuery extends Query<any, IReview> {
  r?: IReview | null;
  options?: { session?: mongoose.ClientSession | null }; // Explicit session typing
}

// Interface for Review model
interface IReviewModel extends Model<IReview> {
  calcAverageRating(productId: mongoose.Types.ObjectId, session?: mongoose.ClientSession | null): Promise<void>;
}

const reviewSchema = new Schema<IReview, IReviewModel>({
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
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required'],
    index: true, // For product-based queries
  },
  user: {
    type: Schema.Types.ObjectId,
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
reviewSchema.statics.calcAverageRating = async function (
  productId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession | null = null
): Promise<void> {
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

  const updateData: { ratingAverage: number; ratingQuantity: number } =
    stats.length > 0
      ? {
          ratingAverage: stats[0].avgRating,
          ratingQuantity: stats[0].nRating,
        }
      : { ratingAverage: 0, ratingQuantity: 0 };

  await Product.findByIdAndUpdate(productId, updateData, options);
};

// Middleware to update average rating after save (document middleware)
reviewSchema.post<IReview>('save', async function (doc) {
  const existingSession = (this.$session() as mongoose.ClientSession) || null;
  const sessionStartedHere = !existingSession;
  const session = existingSession || (await mongoose.startSession());

  try {
    const productIdToPass = doc.product instanceof mongoose.Types.ObjectId
      ? doc.product
      // If doc.product is IProduct, extract _id and cast it to ObjectId
      : (doc.product as IProduct)._id as mongoose.Types.ObjectId; 

    if (sessionStartedHere) {
      await session.withTransaction(async () => {
        await (this.constructor as IReviewModel).calcAverageRating(productIdToPass, session);
      });
    } else {
      await (this.constructor as IReviewModel).calcAverageRating(productIdToPass, session);
    }
  } catch (error: unknown) {
    throw new mongoose.Error(`Failed to update product ratings after save: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (sessionStartedHere) session.endSession();
  }
});

// Middleware to update average rating after update or delete (query middleware)
reviewSchema.post<ReviewQuery>(/^findOneAnd/, async function (doc: IReview | null) {
  if (!doc) return;

  const existingSession = (this.options?.session as mongoose.ClientSession) || null;
  const sessionStartedHere = !existingSession;
  const session = existingSession || (await mongoose.startSession());

  try {
    const productIdToPass = doc.product instanceof mongoose.Types.ObjectId
      ? doc.product
      // If doc.product is IProduct, extract _id and cast it to ObjectId
      : (doc.product as IProduct)._id as mongoose.Types.ObjectId;

    if (sessionStartedHere) {
      await session.withTransaction(async () => {
        await (this.model as IReviewModel).calcAverageRating(productIdToPass, session);
      });
    } else {
      await (this.model as IReviewModel).calcAverageRating(productIdToPass, session);
    }
  } catch (error: unknown) {
    throw new mongoose.Error(`Failed to update product ratings after update/delete: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    if (sessionStartedHere) session.endSession();
  }
});

// Create and export the Review model
const Review = mongoose.model<IReview, IReviewModel>('Review', reviewSchema);

export default Review;
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