import mongoose, { Schema, Document, Model, PopulateOptions } from 'mongoose';
import slugify from 'slugify'; // Assuming you have 'slugify' installed
import User, { IUser } from './UserModel'; // Assuming UserModel.ts exports IUser

// 1. Define Interface for Product Document
export interface IProduct extends Document {
  title: string;
  owner: mongoose.Types.ObjectId | IUser; // Can be ObjectId or populated User document
  slug: string;
  description: string;
  category: string;
  tags: string[];
  brand: string;
  sku: string;
  thumbnail: string;
  rate: number; // Base rate/price before GST
  price: number; // Final price after GST (calculated)
  gstRate: number;
  discountPercentage: number;
  stock: number;
  availabilityStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  createdAt: Date;
  updatedAt: Date;

  // Virtuals (these will be available on the document instance when populated)
  finalPrice: number; // This is a virtual, so it's a getter
  reviews?: any[]; // You would typically define an IReview interface and use IReview[] here
}

// 2. Define Interface for Product Model (if you have static methods)
export interface IProductModel extends Model<IProduct> {
  // If you had static methods like Product.findByCategory, they would go here
  // For example: findByCategory(category: string): Promise<IProduct[]>;
}

const productSchema = new mongoose.Schema<IProduct>({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true, // Every product must belong to a user/owner
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  category: { type: String, required: [true, 'Category is required'], trim: true },
  tags: [{ type: String, trim: true }],
  brand: { type: String, required: [true, 'Brand is required'], trim: true },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  thumbnail: { type: String, required: [true, 'Thumbnail image is required'] },
  rate: {
    type: Number,
    required: [true, 'Base rate/price is required'],
    min: [0, 'Rate cannot be negative'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  gstRate: {
    type: Number,
    default: 18,
    min: [0, 'GST rate cannot be negative'],
    max: [100, 'GST rate cannot exceed 100%'],
  },
  discountPercentage: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
  },
  availabilityStatus: {
    type: String,
    enum: ['In Stock', 'Low Stock', 'Out of Stock'],
    required: [true, 'Availability status is required'],
    default: 'In Stock',
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  timestamps: true,
});

// Indexes
productSchema.index({ price: 1 });
productSchema.index({ slug: 1 }); // Ensure slug index is enabled

// Virtual for final price
productSchema.virtual('finalPrice').get(function (this: IProduct) {
  const priceAfterTax = this.price; // This `price` is already inclusive of GST from pre-save
  const discountAmount = (priceAfterTax * this.discountPercentage) / 100;
  return priceAfterTax - discountAmount;
});

// Middleware
productSchema.pre<IProduct>('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title, { lower: true, strict: true }); // strict: true for better slugs
  }
  // Recalculate 'price' based on 'rate' and 'gstRate' if either is modified or if it's a new document
  if (this.isModified('rate') || this.isNew || this.isModified('gstRate')) {
    const taxableValue = this.rate;
    const gstAmount = (taxableValue * this.gstRate) / 100;
    this.price = taxableValue + gstAmount;
  }
  // Update availabilityStatus based on stock
  if (this.isModified('stock')) {
    if (this.stock === 0) {
      this.availabilityStatus = 'Out of Stock';
    } else if (this.stock > 0 && this.stock <= 10) { // Example threshold for 'Low Stock'
      this.availabilityStatus = 'Low Stock';
    } else {
      this.availabilityStatus = 'In Stock';
    }
  }

  this.updatedAt = new Date(); // Explicitly update updatedAt for timestamps
  next();
});

// Virtual for reviews (assuming a Review model exists)
productSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'product', // Field in Review model that refers to Product's _id
  localField: '_id', // Field in Product model to match
});

// Pre-find hook to populate owner and optionally reviews
productSchema.pre(/^find/, function (this: mongoose.Query<IProduct, IProduct>, next) {
    this.populate([
        { path: 'owner', select: 'name email' },
        { path: 'reviews', select: 'rating userreview user' } // Populate reviews and select specific fields
    ] as PopulateOptions[]);
    next();
});

const Product = mongoose.model<IProduct, IProductModel>('Product', productSchema);
export default Product;