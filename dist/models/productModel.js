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
const slugify_1 = __importDefault(require("slugify"));
const productSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        unique: true,
    },
    slug: {
        type: String,
        unique: true,
    },
    description: String,
    rate: {
        type: Number,
        required: [true, 'Rate is required'],
        min: [0, 'Rate cannot be negative'],
    },
    gstRate: {
        type: Number,
        required: [true, 'GST rate is required'],
        min: [0, 'GST rate cannot be negative'],
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative'],
    },
    discountPercentage: {
        type: Number,
        default: 0,
        min: [0, 'Discount cannot be negative'],
        max: [100, 'Discount cannot exceed 100%'],
    },
    finalPrice: {
        type: Number,
        required: [true, 'Final price is required'],
        min: [0, 'Final price cannot be negative'],
    },
    stock: {
        type: Number,
        required: [true, 'Stock is required'],
        min: [0, 'Stock cannot be negative'],
    },
    availabilityStatus: {
        type: String,
        enum: ['In Stock', 'Low Stock', 'Out of Stock'],
        required: [true, 'Availability status is required'],
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
    },
    brand: String,
    images: [String],
    ratingAverage: {
        type: Number,
        default: 0,
        min: [0, 'Rating average cannot be negative'],
        max: [5, 'Rating average cannot exceed 5'],
    },
    ratingQuantity: {
        type: Number,
        default: 0,
        min: [0, 'Rating quantity cannot be negative'],
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
// Virtual for reviews
productSchema.virtual('reviews', {
    ref: 'Review',
    foreignField: 'product',
    localField: '_id',
});
// Helper function to calculate price
const calculatePrice = (doc) => {
    const taxableValue = doc.rate;
    const gstAmount = (taxableValue * doc.gstRate) / 100;
    doc.price = taxableValue + gstAmount;
    const discountAmount = (doc.price * doc.discountPercentage) / 100;
    doc.finalPrice = doc.price - discountAmount;
};
// Helper function to update availability status
const updateAvailabilityStatus = (doc) => {
    if (doc.stock === 0) {
        doc.availabilityStatus = 'Out of Stock';
    }
    else if (doc.stock <= 10) {
        doc.availabilityStatus = 'Low Stock';
    }
    else {
        doc.availabilityStatus = 'In Stock';
    }
};
// Pre-save middleware to set slug, price, and availability
productSchema.pre('save', async function (next) {
    if (this.isModified('title')) {
        let slug = (0, slugify_1.default)(this.title, { lower: true, strict: true });
        let count = 1;
        while (await Product.findOne({ slug, _id: { $ne: this._id } })) {
            slug = `${(0, slugify_1.default)(this.title, { lower: true, strict: true })}-${count++}`;
        }
        this.slug = slug;
    }
    if (this.isModified('rate') || this.isNew || this.isModified('gstRate') || this.isModified('discountPercentage')) {
        calculatePrice(this);
    }
    if (this.isModified('stock')) {
        updateAvailabilityStatus(this);
    }
    this.updatedAt = new Date();
    next();
});
// Create and export the Product model
const Product = mongoose_1.default.model('Product', productSchema);
exports.default = Product;
// import mongoose, { Schema, Document, Model, PopulateOptions } from 'mongoose';
// import slugify from 'slugify'; // Assuming you have 'slugify' installed
// import User, { IUser } from './UserModel'; // Assuming UserModel.ts exports IUser
// // 1. Define Interface for Product Document
// export interface IProduct extends Document {
//   title: string;
//   owner: mongoose.Types.ObjectId | IUser; // Can be ObjectId or populated User document
//   slug: string;
//   description: string;
//   category: string;
//   tags: string[];
//   brand: string;
//   sku: string;
//   thumbnail: string;
//   rate: number; // Base rate/price before GST
//   price: number; // Final price after GST (calculated)
//   gstRate: number;
//   discountPercentage: number;
//   stock: number;
//   availabilityStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
//   createdAt: Date;
//   updatedAt: Date;
//   // Virtuals (these will be available on the document instance when populated)
//   finalPrice: number; // This is a virtual, so it's a getter
//   reviews?: any[]; // You would typically define an IReview interface and use IReview[] here
// }
// // 2. Define Interface for Product Model (if you have static methods)
// export interface IProductModel extends Model<IProduct> {
//   // If you had static methods like Product.findByCategory, they would go here
//   // For example: findByCategory(category: string): Promise<IProduct[]>;
// }
// const productSchema = new mongoose.Schema<IProduct>({
//   title: {
//     type: String,
//     required: [true, 'Product title is required'],
//     trim: true,
//     maxlength: [200, 'Title cannot exceed 200 characters'],
//   },
//   owner: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true, // Every product must belong to a user/owner
//   },
//   slug: {
//     type: String,
//     unique: true,
//     lowercase: true,
//     index: true,
//   },
//   description: {
//     type: String,
//     required: [true, 'Description is required'],
//     trim: true,
//     maxlength: [500, 'Description cannot exceed 500 characters'],
//   },
//   category: { type: String, required: [true, 'Category is required'], trim: true },
//   tags: [{ type: String, trim: true }],
//   brand: { type: String, required: [true, 'Brand is required'], trim: true },
//   sku: {
//     type: String,
//     required: [true, 'SKU is required'],
//     unique: true,
//     trim: true,
//     uppercase: true,
//     index: true,
//   },
//   thumbnail: { type: String, required: [true, 'Thumbnail image is required'] },
//   rate: {
//     type: Number,
//     required: [true, 'Base rate/price is required'],
//     min: [0, 'Rate cannot be negative'],
//   },
//   price: {
//     type: Number,
//     required: [true, 'Price is required'],
//     min: [0, 'Price cannot be negative'],
//   },
//   gstRate: {
//     type: Number,
//     default: 18,
//     min: [0, 'GST rate cannot be negative'],
//     max: [100, 'GST rate cannot exceed 100%'],
//   },
//   discountPercentage: {
//     type: Number,
//     default: 0,
//     min: [0, 'Discount cannot be negative'],
//     max: [100, 'Discount cannot exceed 100%'],
//   },
//   stock: {
//     type: Number,
//     required: [true, 'Stock quantity is required'],
//     min: [0, 'Stock cannot be negative'],
//   },
//   availabilityStatus: {
//     type: String,
//     enum: ['In Stock', 'Low Stock', 'Out of Stock'],
//     required: [true, 'Availability status is required'],
//     default: 'In Stock',
//   },
// }, {
//   toJSON: { virtuals: true },
//   toObject: { virtuals: true },
//   timestamps: true,
// });
// // Indexes
// productSchema.index({ price: 1 });
// productSchema.index({ slug: 1 }); // Ensure slug index is enabled
// // Virtual for final price
// productSchema.virtual('finalPrice').get(function (this: IProduct) {
//   const priceAfterTax = this.price; // This `price` is already inclusive of GST from pre-save
//   const discountAmount = (priceAfterTax * this.discountPercentage) / 100;
//   return priceAfterTax - discountAmount;
// });
// // Middleware
// productSchema.pre<IProduct>('save', function (next) {
//   if (this.isModified('title')) {
//     this.slug = slugify(this.title, { lower: true, strict: true }); // strict: true for better slugs
//   }
//   // Recalculate 'price' based on 'rate' and 'gstRate' if either is modified or if it's a new document
//   if (this.isModified('rate') || this.isNew || this.isModified('gstRate')) {
//     const taxableValue = this.rate;
//     const gstAmount = (taxableValue * this.gstRate) / 100;
//     this.price = taxableValue + gstAmount;
//   }
//   // Update availabilityStatus based on stock
//   if (this.isModified('stock')) {
//     if (this.stock === 0) {
//       this.availabilityStatus = 'Out of Stock';
//     } else if (this.stock > 0 && this.stock <= 10) { // Example threshold for 'Low Stock'
//       this.availabilityStatus = 'Low Stock';
//     } else {
//       this.availabilityStatus = 'In Stock';
//     }
//   }
//   this.updatedAt = new Date(); // Explicitly update updatedAt for timestamps
//   next();
// });
// // Virtual for reviews (assuming a Review model exists)
// productSchema.virtual('reviews', {
//   ref: 'Review',
//   foreignField: 'product', // Field in Review model that refers to Product's _id
//   localField: '_id', // Field in Product model to match
// });
// // Pre-find hook to populate owner and optionally reviews
// productSchema.pre(/^find/, function (this: mongoose.Query<IProduct, IProduct>, next) {
//     this.populate([
//         { path: 'owner', select: 'name email' },
//         { path: 'reviews', select: 'rating userreview user' } // Populate reviews and select specific fields
//     ] as PopulateOptions[]);
//     next();
// });
// const Product = mongoose.model<IProduct, IProductModel>('Product', productSchema);
// export default Product;
//# sourceMappingURL=productModel.js.map