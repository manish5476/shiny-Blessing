import mongoose, { Schema, Document, Model, Query, PopulateOptions, ClientSession } from 'mongoose';
import Product, { IProduct } from './productModel';
import User, { IUser } from './UserModel';

// 1. Define Interface for Review Document
export interface IReview extends Document {
  user: mongoose.Types.ObjectId | IUser;
  owner: mongoose.Types.ObjectId | IUser;
  product: mongoose.Types.ObjectId | IProduct;
  rating: number;
  userreview: string;
  createdAt: Date;
  updatedAt: Date;
}

// 2. Define Interface for Review Model with static methods
export interface IReviewModel extends Model<IReview> {
  calcAverageRating(productId: mongoose.Types.ObjectId, session?: mongoose.ClientSession | null): Promise<void>;
}

const reviewSchema = new mongoose.Schema<IReview>({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'A review must be given by a User'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'A review must belong to a Product'],
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    required: true,
  },
  userreview: {
    type: String,
    required: [true, 'Review text is required'],
    trim: true,
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
});

// Unique index to prevent duplicate reviews per user-product pair
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Static method to calculate average rating (and quantity) for a product
reviewSchema.statics.calcAverageRating = async function (
  productId: mongoose.Types.ObjectId,
  session: mongoose.ClientSession | null = null
): Promise<void> {
  const options = session ? { session } : {};
  const stats = await (this as IReviewModel).aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ], options);

  let updateData: { ratingAverage: number; ratingQuantity: number };

  if (stats.length > 0) {
    updateData = {
      ratingAverage: stats[0].avgRating,
      ratingQuantity: stats[0].nRating,
    };
  } else {
    updateData = { ratingAverage: 0, ratingQuantity: 0 };
  }

  const ProductModel = await import('./productModel').then(m => m.default) as Model<IProduct>;
  await ProductModel.findByIdAndUpdate(productId, updateData, options);
};

// Populate user and product data before any find query
reviewSchema.pre(/^find/, function (this: Query<IReview | IReview[], IReview>, next) {
  this.populate([
    {
      path: 'user',
      select: 'name email',
    },
    {
      path: 'product',
      select: 'title',
    },
    {
      path: 'owner',
      select: 'name email',
    }
  ] as PopulateOptions[]);
  next();
});

// Post-save hook to recalculate product ratings after a new review is saved
reviewSchema.post<IReview>('save', async function (doc) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    await (this.constructor as IReviewModel).calcAverageRating(doc.product as mongoose.Types.ObjectId, session);
    await session.commitTransaction();
  } catch (error: unknown) {
    await session.abortTransaction();
    throw new mongoose.Error(`Failed to update product ratings after save: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    session.endSession();
  }
});

// Define a type for the query context to allow the `r` property
// IMPORTANT: Do NOT define `session` here, as it's a method on Query.
interface ReviewQuery extends Query<IReview | null, IReview> {
  r?: IReview | null; // Optional property to store the found document
  options?: { session?: ClientSession }; // Add options property to access session
}

// Pre-findOneAnd/findByIdAnd hook to store the document before modification/deletion
reviewSchema.pre<ReviewQuery>(/^findOneAnd/, async function (next) {
  // To get the session being used by the current query (`this`), you can use `this.options.session`.
  // This is a reliable way to get the ClientSession instance.
  const currentQuerySession: ClientSession | undefined = this.options?.session;

  // Now, pass this `ClientSession | undefined` to the `.session()` method of the sub-query.
  // The `.session()` method expects `ClientSession | null`, so use `|| null` to handle `undefined`.
  this.r = await this.model.findOne(this.getFilter()).session(currentQuerySession || null);
  next();
});

// Post-findOneAnd/findByIdAnd hook to recalculate product ratings after a review is updated or deleted
reviewSchema.post<ReviewQuery>(/^findOneAnd/, async function (doc, next) {
  if (this.r) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await (this.r.constructor as IReviewModel).calcAverageRating(this.r.product as mongoose.Types.ObjectId, session);
      await session.commitTransaction();
    } catch (error: unknown) {
      await session.abortTransaction();
      throw new mongoose.Error(`Failed to update product ratings after findOneAnd: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      session.endSession();
    }
  }
});

const Review = mongoose.model<IReview, IReviewModel>('Review', reviewSchema);
export default Review;