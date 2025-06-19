// src/controllers/handleFactory.ts

import { Request, Response, NextFunction } from 'express';
import type { Model, Document, PopulateOptions, FilterQuery } from 'mongoose';
// import AppError from "../utils/appError";
import { catchAsync } from '../utils/catchAsyncModule';
import { ApiFeatures } from '../utils/ApiFeatures';
import { IUser } from '../models/UserModel'; // Assuming this path is correct for your User interface
import mongoose, { Types } from 'mongoose'; // Import Types for ObjectId

// Define a base interface for documents that are expected to have an 'owner' field.
// All models passed to these factory functions (except maybe for superAdmin-only routes)
// should extend this to ensure type safety for the 'owner' property in queries.
interface IOwnedDocument extends Document {
  owner: Types.ObjectId; // Owner is expected to be an ObjectId
  // Add any other common fields required by your generic operations if necessary
}

// Extend the Express Request interface to include our custom 'user' property.
// It's marked optional here (`?`) because the authentication middleware might not have run yet,
// or for routes accessible without authentication. If your routes ALWAYS require authentication,
// you can make it `user: IUser;` to simplify guards.
interface AuthenticatedRequest extends Request {
  user?: IUser;
}

/**
 * Generic factory function to delete a single document by ID and owner.
 * Ensures that only the owner or a superAdmin can delete their documents.
 * @param {Model<T>} Model - The Mongoose Model to operate on.
 * @returns {Function} Express middleware function.
 */
export const deleteOne = <T extends IOwnedDocument>(Model: Model<T>): Function =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Authentication guard: Ensure user is logged in and has an ID
    if (!req.user || !req.user._id) {
      return next(new AppError('Authentication required to perform this action.', 401));
    }

    // Attempt to delete the document by _id and owner
    const doc = await Model.findOneAndDelete({
      _id: req.params.id as unknown as Types.ObjectId, // Explicitly cast req.params.id to ObjectId
      owner: req.user._id as Types.ObjectId // Explicitly cast req.user._id to ObjectId
    });

    if (!doc) {
      return next(new AppError(`${Model.modelName} not found or unauthorized to delete.`, 404));
    }

    res.status(204).json({ // 204 No Content is standard for successful DELETE with no response body
      status: 'success',
      statusCode: 204,
      message: `${Model.modelName} deleted successfully.`,
      data: null // No data returned for 204
    });
  });

/**
 * Generic factory function to update a single document by ID and owner.
 * @param {Model<T>} Model - The Mongoose Model to operate on.
 * @returns {Function} Express middleware function.
 */
export const updateOne = <T extends IOwnedDocument>(Model: Model<T>): Function =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user._id) {
      return next(new AppError('Authentication required to perform this action.', 401));
    }

    const doc = await Model.findOneAndUpdate(
      {
        _id: req.params.id as unknown as Types.ObjectId, // Explicitly cast to ObjectId
        owner: req.user._id as Types.ObjectId // Explicitly cast to ObjectId
      },
      req.body,
      {
        new: true,           // Return the modified document rather than the original
        runValidators: true, // Run schema validators on update
        context: 'query'     // Required for validators on update with some Mongoose versions
      }
    );

    if (!doc) {
      return next(new AppError(`${Model.modelName} not found or unauthorized to update.`, 404));
    }

    res.status(200).json({
      status: 'success',
      statusCode: 200,
      data: doc
    });
  });

/**
 * Generic factory function to create a new document, automatically assigning the owner.
 * @param {Model<T>} Model - The Mongoose Model to operate on.
 * @returns {Function} Express middleware function.
 */
export const newOne = <T extends IOwnedDocument>(Model: Model<T>): Function =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user._id) {
      return next(new AppError('Authentication required to create this resource.', 401));
    }

    // Create the document, spreading req.body and adding the owner from the authenticated user
    const doc = await Model.create({
      ...req.body,
      owner: req.user._id as Types.ObjectId // Explicitly cast to ObjectId
    });

    if (!doc) {
      // This case is less likely if `Model.create` throws an error on failure,
      // but it's good defensive programming.
      return next(new AppError(`Failed to create ${Model.modelName}.`, 400));
    }

    res.status(201).json({ // 201 Created is the correct status code for successful creation
      status: 'success',
      statusCode: 201,
      data: doc
    });
  });

/**
 * Generic factory function to get a single document by ID.
 * Supports optional population and checks for owner or superAdmin role.
 * @param {Model<T>} Model - The Mongoose Model to operate on.
 * @param {string | PopulateOptions | (string | PopulateOptions)[]} [autoPopulateOptions] - Optional fields to populate.
 * @returns {Function} Express middleware function.
 */
export const getOne = <T extends IOwnedDocument>( // T must extend IOwnedDocument for 'owner' filter
  Model: Model<T>,
  autoPopulateOptions?: string | PopulateOptions | (string | PopulateOptions)[]
): Function =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const isSuperAdmin = req.user?.role === 'superAdmin';

    // Authentication guard: For non-superAdmins, user and _id must exist
    if (!isSuperAdmin && (!req.user || !req.user._id)) {
      return next(new AppError('Authentication required to access this resource.', 401));
    }

    // Build the filter query. Use mongoose.FilterQuery for better type safety.
    const filter: FilterQuery<T> = { _id: req.params.id as unknown as Types.ObjectId };

    if (!isSuperAdmin) {
      // If not a superAdmin, restrict access to documents owned by the current user
      filter.owner = req.user?._id as Types.ObjectId; // Now safe because T extends IOwnedDocument
    }

    let query = Model.findOne(filter);

    // Apply population if options are provided
    if (autoPopulateOptions) {
      if (typeof autoPopulateOptions === 'string') {
        query = query.populate({ path: autoPopulateOptions });
      } else if (Array.isArray(autoPopulateOptions)) {
        // Map string paths in array to { path: string } objects for populate
        const normalizedPopulateOptions = autoPopulateOptions.map(option =>
          typeof option === 'string' ? { path: option } : option
        );
        query = query.populate(normalizedPopulateOptions as (string | PopulateOptions)[]);
      } else {
        // It's already a PopulateOptions object
        query = query.populate(autoPopulateOptions);
      }
    }

    const doc = await query;

    if (!doc) {
      return next(
        new AppError(
          `${Model.modelName} not found${isSuperAdmin ? '.' : ' or unauthorized.'}`,
          404
        )
      );
    }

    res.status(200).json({
      status: 'success',
      statusCode: 200,
      data: doc
    });
  });

/**
 * Generic factory function to get all documents.
 * Filters by owner for regular users, allows superAdmins to see all.
 * @param {Model<T>} Model - The Mongoose Model to operate on.
 * @returns {Function} Express middleware function.
 */
export const getAll = <T extends IOwnedDocument>(Model: Model<T>): Function => // T must extend IOwnedDocument
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const isSuperAdmin = req.user?.role === 'superAdmin';

    // Authentication guard: If not superAdmin, user and _id must exist
    if (!isSuperAdmin && (!req.user || !req.user._id)) {
      throw new AppError('Authentication required to list resources.', 401);
    }

    // Build the base filter: empty for superAdmin, owner-specific for others
    const baseFilter: FilterQuery<T> = isSuperAdmin ? {} : { owner: req.user?._id as Types.ObjectId };

    // Combine base filter with query parameters from the request
    // This allows client-side filtering while respecting ownership.
    const combinedFilter = {
      ...baseFilter,
      ...req.query
    };

    // Apply API features (filtering, sorting, limiting fields, pagination)
    const features = new ApiFeatures<T>(Model.find(), combinedFilter)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const docs = await features.query; // Execute the query

    res.status(200).json({
      status: 'success',
      statusCode: 200,
      results: docs.length,
      data: docs
    });
  });

/**
 * Generic factory function to delete multiple documents by IDs.
 * Supports deletion by owner or by superAdmin.
 * @param {Model<T>} Model - The Mongoose Model to operate on.
 * @returns {Function} Express middleware function.
 */
export const deleteMultiple = <T extends IOwnedDocument>(Model: Model<T>): Function =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { ids } = req.body;
    const userId = req.user?._id;
    const isSuperAdmin = req.user?.role === 'superAdmin';

    // Authentication guard
    if (!isSuperAdmin && (!req.user || !userId)) {
      return next(new AppError('Authentication required to delete multiple resources.', 401));
    }

    // Input validation for 'ids'
    if (!Array.isArray(ids) || ids.length === 0) {
      return next(new AppError('No valid IDs provided for deletion.', 400));
    }

    // Filter and convert IDs to Mongoose ObjectIds
    const validIds = ids.filter((id: string) => mongoose.Types.ObjectId.isValid(id)).map((id: string) => new Types.ObjectId(id));
    if (!validIds.length) {
      return next(new AppError('No valid ObjectIds provided.', 400));
    }

    // Build the filter for deletion
    const filter: FilterQuery<T> = { _id: { $in: validIds } };
    if (!isSuperAdmin) {
      filter.owner = userId as Types.ObjectId; // Apply owner filter if not superAdmin
    }

    const result = await Model.deleteMany(filter);

    if (result.deletedCount === 0) {
      return next(
        new AppError(`No ${Model.modelName}s found matching the criteria or unauthorized.`, 404)
      );
    }

    res.status(200).json({ // 200 OK is fine for deleteMany, 204 if no body
      status: 'success',
      statusCode: 200,
      message: `${result.deletedCount} ${Model.modelName}(s) deleted successfully.`,
      data: null // Typically no data for deleteMany success
    });
  });

/**
 * Generic factory function to fetch data for dropdowns (e.g., ID and name fields).
 * Filters by owner for regular users, allows superAdmins to see all.
 * Does NOT populate by default.
 * @param {Model<T>} Model - The Mongoose Model to operate on.
 * @param {string[]} fields - An array of field names to include in the dropdown data (e.g., ['name', 'code']).
 * @returns {Function} Express middleware function.
 */
export const getModelDropdownWithoutStatus = <T extends IOwnedDocument>( // T must extend IOwnedDocument
  Model: Model<T>,
  fields: string[]
): Function =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const isSuperAdmin = req.user?.role === 'superAdmin';

    // Authentication guard
    if (!isSuperAdmin && (!req.user || !req.user._id)) {
      return next(new AppError('Authentication required to fetch dropdown data.', 401));
    }

    // Build the filter: empty for superAdmin, owner-specific for others
    const filter: FilterQuery<T> = {};
    if (!isSuperAdmin) {
      filter.owner = req.user?._id as Types.ObjectId; // Apply owner filter
    }

    try {
      // Ensure _id is always included and combine with specified fields
      const selectFields = new Set([...fields, '_id']);
      const docs = await Model.find(filter)
        .select(Array.from(selectFields).join(' ')) // Select only specified fields
        .lean(); // Return plain JavaScript objects instead of Mongoose documents

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        results: docs.length,
        data: { dropdown: docs }
      });
    } catch (err: unknown) { // Use 'unknown' for catch clause for better safety
      console.error("Error fetching dropdown data:", err);
      // Provide a more informative error message
      return next(new AppError(`Failed to fetch dropdown data: ${(err instanceof Error ? err.message : 'Unknown error')}`, 500));
    }
  });
// import { Request, Response, NextFunction } from 'express';
// import type { Model, Document, PopulateOptions } from 'mongoose'; // Use type import for better performance
// import AppError from "../utils/appError";
// import { catchAsync } from '../utils/catchAsyncModule';
// import { ApiFeatures } from '../utils/ApiFeatures';
// import { IUser } from '../models/UserModel';
// import mongoose from 'mongoose'; // Added for ObjectId.isValid and FilterQuery

// interface AuthenticatedRequest extends Request {
//   user?: IUser; // 'user' is optional here because the 'protect' middleware might not always run first,
//                 // or super admins might not have a user tied to req for certain ops (less common).
//                 // If 'protect' always runs, make it `user: IUser;`.
// }

// export const deleteOne = <T extends Document>(Model: Model<T>) =>
//   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     // Ensure req.user._id exists before using it in the query.
//     // In a real protected route, req.user is guaranteed, but TypeScript needs guarding if 'user' is optional.
//     if (!req.user?._id) {
//       return next(new AppError('Authentication required to perform this action.', 401));
//     }

//     const doc = await Model.findOneAndDelete({
//       _id: req.params.id,
//       owner: req.user._id // Now safe to use req.user._id
//     });

//     if (!doc) {
//       return next(new AppError(`${Model.modelName} not found or unauthorized.`, 404));
//     }

//     res.status(200).json({
//       status: 'success',
//       statusCode: 200,
//       message: `${Model.modelName} deleted successfully.`,
//       data: null
//     });
//   });

// export const updateOne = <T extends Document>(Model: Model<T>) =>
//   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user?._id) {
//       return next(new AppError('Authentication required to perform this action.', 401));
//     }

//     const doc = await Model.findOneAndUpdate(
//       {
//         _id: req.params.id,
//         owner: req.user._id
//       },
//       req.body,
//       {
//         new: true,
//         runValidators: true
//       }
//     );

//     if (!doc) {
//       return next(new AppError(`${Model.modelName} not found or unauthorized.`, 404));
//     }

//     res.status(200).json({
//       status: 'success',
//       statusCode: 200,
//       data: doc
//     });
//   });

// export const newOne = <T extends Document>(Model: Model<T>) =>
//   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     if (!req.user?._id) {
//       return next(new AppError('Authentication required to perform this action.', 401));
//     }

//     const doc = await Model.create({
//       ...req.body,
//       owner: req.user._id
//     });

//     if (!doc) {
//       return next(new AppError(`Failed to create ${Model.modelName}`, 400));
//     }

//     res.status(201).json({
//       status: 'success',
//       statusCode: 201, // Changed to 201 Created for new resource
//       data: doc
//     });
//   });

// export const getOne = <T extends Document>(
//   Model: Model<T>,
//   // Kept the flexible type for autoPopulateOptions for convenience
//   autoPopulateOptions?: string | PopulateOptions | (string | PopulateOptions)[]
// ) =>
//   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const isSuperAdmin = req.user?.role === 'superAdmin';

//     // Guard against undefined req.user for non-superAdmin access if user is optional
//     if (!isSuperAdmin && !req.user?._id) {
//       return next(new AppError('Authentication required to access this resource.', 401));
//     }

//     const filter: any = { _id: req.params.id };
//     if (!isSuperAdmin) {
//       filter.owner = req.user?._id; // Filter by owner if not super admin
//     }

//     let query = Model.findOne(filter);

//     if (autoPopulateOptions) {
//       // --- FIX STARTS HERE ---
//       // Mongoose populate can take a string for simple paths, but its TS definition
//       // prefers PopulateOptions object or an array of them for more complex scenarios.
//       // We'll normalize string inputs to PopulateOptions objects if needed.
//       if (typeof autoPopulateOptions === 'string') {
//         query = query.populate({ path: autoPopulateOptions });
//       } else if (Array.isArray(autoPopulateOptions)) {
//         // Map string paths in array to { path: string } objects
//         const normalizedPopulateOptions = autoPopulateOptions.map(option =>
//           typeof option === 'string' ? { path: option } : option
//         );
//         query = query.populate(normalizedPopulateOptions as (string | PopulateOptions)[]); // Cast back for TS compliance
//       } else {
//         // It's already a PopulateOptions object
//         query = query.populate(autoPopulateOptions);
//       }
//       // --- FIX ENDS HERE ---
//     }

//     const doc = await query;

//     if (!doc) {
//       return next(
//         new AppError(
//           `${Model.modelName} not found${isSuperAdmin ? '.' : ' or unauthorized.'}`,
//           404
//         )
//       );
//     }

//     res.status(200).json({
//       status: 'success',
//       statusCode: 200,
//       data: doc
//     });
//   });

// export const getAll = <T extends Document>(Model: Model<T>) =>
//   catchAsync(async (req: AuthenticatedRequest, res: Response) => {
//     const isSuperAdmin = req.user?.role === 'superAdmin';

//     // Guard against undefined req.user for non-superAdmin access
//     if (!isSuperAdmin && !req.user?._id) {
//       // If we don't have a user and it's not a super admin, they can't access
//       throw new AppError('Authentication required to list resources.', 401);
//     }

//     const baseFilter: mongoose.FilterQuery<T> = isSuperAdmin ? {} : { owner: req.user?._id }; // req.user._id is now safely used after guard

//     // Note: The order here matters. req.query should generally come first if you want its filters
//     // to potentially be overridden or combined with baseFilter.
//     const combinedFilter = {
//       ...baseFilter, // Start with owner filter (or empty for super admin)
//       ...req.query   // Add/override with client-provided query parameters
//     };

//     const features = new ApiFeatures(Model.find(), combinedFilter)
//       .filter()
//       .sort()
//       .limitFields()
//       .paginate();

//     const docs = await features.query;

//     res.status(200).json({
//       status: 'success',
//       statusCode: 200,
//       results: docs.length,
//       data: docs
//     });
//   });

// export const deleteMultiple = <T extends Document>(Model: Model<T>) =>
//   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const { ids } = req.body;
//     const userId = req.user?._id;
//     const isSuperAdmin = req.user?.role === 'superAdmin';

//     // Guard against undefined req.user for non-superAdmin access
//     if (!isSuperAdmin && !userId) {
//       return next(new AppError('Authentication required to delete multiple resources.', 401));
//     }

//     if (!Array.isArray(ids) || ids.length === 0) {
//       return next(new AppError('No valid IDs provided for deletion.', 400));
//     }

//     // Filter out any invalid ObjectId strings
//     const validIds = ids.filter((id: string) => mongoose.Types.ObjectId.isValid(id));
//     if (!validIds.length) {
//       return next(new AppError('No valid ObjectIds provided.', 400));
//     }

//     const filter: mongoose.FilterQuery<T> = { _id: { $in: validIds } };
//     if (!isSuperAdmin) filter.owner = userId; // Apply owner filter

//     const result = await Model.deleteMany(filter);
//     if (result.deletedCount === 0) {
//       return next(
//         new AppError(`No ${Model.modelName}s found or unauthorized.`, 404)
//       );
//     }

//     res.status(200).json({
//       status: 'success',
//       statusCode: 200,
//       message: `${result.deletedCount} ${Model.modelName}(s) deleted.`,
//       data: null // Typically no data on successful deleteMany
//     });
//   });

// export const getModelDropdownWithoutStatus = <T extends Document>(
//   Model: Model<T>,
//   fields: string[]
// ) =>
//   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
//     const isSuperAdmin = req.user?.role === 'superAdmin';

//     // Guard against undefined req.user for non-superAdmin access
//     if (!isSuperAdmin && !req.user?._id) {
//       return next(new AppError('Authentication required to fetch dropdown data.', 401));
//     }

//     const filter: mongoose.FilterQuery<T> = {};
//     if (!isSuperAdmin) filter.owner = req.user?._id; // Apply owner filter

//     try {
//       // Ensure _id is always included for dropdowns
//       const selectFields = new Set([...fields, '_id']);
//       const docs = await Model.find(filter).select(Array.from(selectFields).join(' ')).lean();

//       res.status(200).json({
//         status: 'success',
//         statusCode: 200,
//         results: docs.length,
//         data: { dropdown: docs }
//       });
//     } catch (err: any) { // Catch potential Mongoose errors during find/select
//       console.error("Error fetching dropdown data:", err);
//       return next(new AppError(`Failed to fetch dropdown data: ${err.message || 'Unknown error'}`, 500));
//     }
//   });
// // import { Request, Response, NextFunction } from 'express';
// // import type { Model, Document, PopulateOptions } from 'mongoose';
// // import AppError from "../utils/appError";
// // import { catchAsync } from '../utils/catchAsyncModule';
// // import { ApiFeatures } from '../utils/ApiFeatures';
// // import { IUser } from '../models/UserModel';

// // interface AuthenticatedRequest extends Request {
// //   user?: IUser;
// // }

// // export const deleteOne = <T extends Document>(Model: Model<T>) =>
// //   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
// //     const doc = await Model.findOneAndDelete({
// //       _id: req.params.id,
// //       owner: req.user?._id
// //     });

// //     if (!doc) {
// //       return next(new AppError(`${Model.modelName} not found or unauthorized.`, 404));
// //     }

// //     res.status(200).json({
// //       status: 'success',
// //       statusCode: 200,
// //       message: `${Model.modelName} deleted successfully.`,
// //       data: null
// //     });
// //   });

// // export const updateOne = <T extends Document>(Model: Model<T>) =>
// //   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
// //     const doc = await Model.findOneAndUpdate(
// //       {
// //         _id: req.params.id,
// //         owner: req.user?._id
// //       },
// //       req.body,
// //       {
// //         new: true,
// //         runValidators: true
// //       }
// //     );

// //     if (!doc) {
// //       return next(new AppError(`${Model.modelName} not found or unauthorized.`, 404));
// //     }

// //     res.status(200).json({
// //       status: 'success',
// //       statusCode: 200,
// //       data: doc
// //     });
// //   });

// // export const newOne = <T extends Document>(Model: Model<T>) =>
// //   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
// //     const doc = await Model.create({
// //       ...req.body,
// //       owner: req.user?._id
// //     });

// //     if (!doc) {
// //       return next(new AppError(`Failed to create ${Model.modelName}`, 400));
// //     }

// //     res.status(201).json({
// //       status: 'success',
// //       statusCode: 200,
// //       data: doc
// //     });
// //   });

// // export const getOne = <T extends Document>(
// //   Model: Model<T>,
// //   autoPopulateOptions?: string | PopulateOptions | (string | PopulateOptions)[]
// // ) =>
// //   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
// //     const isSuperAdmin = req.user?.role === 'superAdmin';
// //     const filter: any = { _id: req.params.id };
// //     if (!isSuperAdmin) filter.owner = req.user?._id;

// //     let query = Model.findOne(filter);
// //     if (autoPopulateOptions) query = query.populate(autoPopulateOptions);

// //     const doc = await query;

// //     if (!doc) {
// //       return next(
// //         new AppError(
// //           `${Model.modelName} not found${isSuperAdmin ? '.' : ' or unauthorized.'}`,
// //           404
// //         )
// //       );
// //     }

// //     res.status(200).json({
// //       status: 'success',
// //       statusCode: 200,
// //       data: doc
// //     });
// //   });

// // export const getAll = <T extends Document>(Model: Model<T>) =>
// //   catchAsync(async (req: AuthenticatedRequest, res: Response) => {
// //     const isSuperAdmin = req.user?.role === 'superAdmin';
// //     const baseFilter = isSuperAdmin ? {} : { owner: req.user?._id };

// //     const combinedFilter = {
// //       ...baseFilter,
// //       ...req.query
// //     };

// //     const features = new ApiFeatures(Model.find(), combinedFilter)
// //       .filter()
// //       .sort()
// //       .limitFields()
// //       .paginate();

// //     const docs = await features.query;

// //     res.status(200).json({
// //       status: 'success',
// //       statusCode: 200,
// //       results: docs.length,
// //       data: docs
// //     });
// //   });

// // export const deleteMultiple = <T extends Document>(Model: Model<T>) =>
// //   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
// //     const { ids } = req.body;
// //     const userId = req.user?._id;
// //     const isSuperAdmin = req.user?.role === 'superAdmin';

// //     if (!Array.isArray(ids) || ids.length === 0) {
// //       return next(new AppError('No valid IDs provided for deletion.', 400));
// //     }

// //     const validIds = ids.filter((id: string) => mongoose.Types.ObjectId.isValid(id));
// //     if (!validIds.length) {
// //       return next(new AppError('No valid ObjectIds.', 400));
// //     }

// //     const filter: any = { _id: { $in: validIds } };
// //     if (!isSuperAdmin) filter.owner = userId;

// //     const result = await Model.deleteMany(filter);
// //     if (result.deletedCount === 0) {
// //       return next(
// //         new AppError(`No ${Model.modelName}s found or unauthorized.`, 404)
// //       );
// //     }

// //     res.status(200).json({
// //       status: 'success',
// //       statusCode: 200,
// //       message: `${result.deletedCount} ${Model.modelName}(s) deleted.`
// //     });
// //   });

// // export const getModelDropdownWithoutStatus = <T extends Document>(
// //   Model: Model<T>,
// //   fields: string[]
// // ) =>
// //   catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
// //     const isSuperAdmin = req.user?.role === 'superAdmin';
// //     const filter: any = {};
// //     if (!isSuperAdmin) filter.owner = req.user?._id;

// //     try {
// //       const docs = await Model.find(filter).select([...fields, '_id'].join(' ')).lean();

// //       res.status(200).json({
// //         status: 'success',
// //         statusCode: 200,
// //         results: docs.length,
// //         data: { dropdown: docs }
// //       });
// //     } catch (err) {
// //       return next(new AppError('Failed to fetch dropdown data', 500));
// //     }
// //   });
