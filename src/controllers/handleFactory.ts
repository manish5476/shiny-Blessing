import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Model, Document, PopulateOptions, FilterQuery, Types } from 'mongoose';
import { catchAsync } from '../utils/catchAsyncModule';
import { IUser } from '../models/UserModel'; // Adjust path as needed
import AppError from '../utils/appError'; // Assuming this exists
import { ApiFeatures } from '../utils/ApiFeatures'; // Ensure this is correctly imported if it's a separate file
import { ICustomerModel } from '../models/customerModel';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

interface IOwnedDocument extends Document {
  owner?: Types.ObjectId;
}

const validateObjectId = (id: string, resource: string): Types.ObjectId => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(`Invalid ${resource} ID: ${id}`, 400);
  }
  return new Types.ObjectId(id);
};

const requireAuth = (req: AuthenticatedRequest, resource: string): Types.ObjectId => {
  if (!req.user || !req.user._id) {
    throw new AppError(`Authentication required to access ${resource}.`, 401);
  }
  return req.user._id as Types.ObjectId;
};

export const deleteOne = <T extends Document>(
  Model: Model<T>,
  requireOwner: boolean = true
): RequestHandler =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = requireAuth(req, Model.modelName);
    const id = validateObjectId(req.params.id, Model.modelName);
    const filter: FilterQuery<T> & { owner?: Types.ObjectId } = { _id: id };
    if (requireOwner && req.user?.role !== 'superAdmin') {
      filter.owner = userId;
    }
    const doc = await Model.findOneAndDelete(filter);
    if (!doc) {
      return next(new AppError(`${Model.modelName} not found or unauthorized.`, 404));
    }

    res.status(204).json({
      status: 'success',
      statusCode: 204,
      message: `${Model.modelName} deleted successfully.`,
      data: null,
    });
  });

export const updateOne = <T extends Document>(
  Model: Model<T>,
  requireOwner: boolean = true
): RequestHandler =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = requireAuth(req, Model.modelName);
    const id = validateObjectId(req.params.id, Model.modelName);

    // Explicitly allow 'owner' in FilterQuery if requireOwner is true
    const filter: FilterQuery<T> & { owner?: Types.ObjectId } = { _id: id };
    if (requireOwner && req.user?.role !== 'superAdmin') {
      filter.owner = userId;
    }

    const doc = await Model.findOneAndUpdate(filter, req.body, {
      new: true,
      runValidators: true,
      context: 'query', // Important for pre/post hooks to correctly recognize the context
    });

    if (!doc) {
      return next(new AppError(`${Model.modelName} not found or unauthorized.`, 404));
    }

    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: `${Model.modelName} updated successfully.`,
      data: doc,
    });
  });

/**
 * Generic factory function to create a new document.
 * @param Model - The Mongoose Model to operate on.
 * @param requireOwner - Whether to assign the owner field (default: true).
 * @returns Express middleware function.
 */
export const newOne = <T extends Document>(
  Model: Model<T>,
  requireOwner: boolean = true
): RequestHandler =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = requireAuth(req, Model.modelName);

    // Use a partial type for docData to ensure 'owner' can be added.
    // If T extends Document<any, any, any, any> & { owner?: Types.ObjectId },
    // this becomes cleaner. For now, using 'any' for docData.
    const docData: Record<string, any> = { ...req.body };
    if (requireOwner) {
      docData.owner = userId;
    }

    const doc = await Model.create(docData);

    res.status(201).json({
      status: 'success',
      statusCode: 201,
      message: `${Model.modelName} created successfully.`,
      data: doc,
    });
  });

/**
 * Generic factory function to get a single document by ID.
 * @param Model - The Mongoose Model to operate on.
 * @param autoPopulateOptions - Optional fields to populate.
 * @param requireOwner - Whether to enforce owner-based retrieval (default: true).
 * @returns Express middleware function.
 */
export const getOne = <T extends Document>(
  Model: Model<T>,
  autoPopulateOptions?: string | PopulateOptions | (string | PopulateOptions)[],
  requireOwner: boolean = true
): RequestHandler =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = requireAuth(req, Model.modelName);
    const id = validateObjectId(req.params.id, Model.modelName);

    // Explicitly allow 'owner' in FilterQuery if requireOwner is true
    const filter: FilterQuery<T> & { owner?: Types.ObjectId } = { _id: id };
    if (requireOwner && req.user?.role !== 'superAdmin') {
      filter.owner = userId;
    }

    let query = Model.findOne(filter);

    if (autoPopulateOptions) {
      if (typeof autoPopulateOptions === 'string') {
        query = query.populate({ path: autoPopulateOptions });
      } else if (Array.isArray(autoPopulateOptions)) {
        const normalizedPopulateOptions = autoPopulateOptions.map((option) =>
          typeof option === 'string' ? { path: option } : option
        );
        query = query.populate(normalizedPopulateOptions);
      } else {
        query = query.populate(autoPopulateOptions);
      }
    }

    const doc = await query;

    if (!doc) {
      return next(new AppError(`${Model.modelName} not found or unauthorized.`, 404));
    }

    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: `${Model.modelName} retrieved successfully.`,
      data: doc,
    });
  });

/**
 * Generic factory function to get all documents.
 * @param Model - The Mongoose Model to operate on.
 * @param requireOwner - Whether to enforce owner-based retrieval (default: true).
 * @returns Express middleware function.
 */
export const getAll = <T extends Document>(Model: Model<T>, requireOwner: boolean = true): RequestHandler =>
  catchAsync(async (req: AuthenticatedRequest, res: Response) => {
    const userId = requireAuth(req, Model.modelName);
    const isSuperAdmin = req.user?.role === 'superAdmin';

    // Explicitly allow 'owner' in FilterQuery
    const filter: FilterQuery<T> & { owner?: Types.ObjectId } = isSuperAdmin || !requireOwner ? {} : { owner: userId };
    const combinedFilter = { ...filter, ...req.query };
    const features = new ApiFeatures<T>(Model.find(combinedFilter as FilterQuery<T>), req.query); // Pass combinedFilter to find()
    const finalQuery = features
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const docs = await finalQuery.query;
    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: `Retrieved ${docs.length} ${Model.modelName}(s).`,
      results: docs.length,
      data: docs,
    });
  });

/**
 * Generic factory function to delete multiple documents by IDs.
 * @param Model - The Mongoose Model to operate on.
 * @param requireOwner - Whether to enforce owner-based deletion (default: true).
 * @returns Express middleware function.
 */
export const deleteMultiple = <T extends Document>(
  Model: Model<T>,
  requireOwner: boolean = true
): RequestHandler =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const { ids } = req.body;
    const userId = requireAuth(req, Model.modelName);
    const isSuperAdmin = req.user?.role === 'superAdmin';

    if (!Array.isArray(ids) || ids.length === 0) {
      return next(new AppError('No valid IDs provided for deletion.', 400));
    }

    const validIds = ids
      .filter((id: string) => Types.ObjectId.isValid(id))
      .map((id: string) => new Types.ObjectId(id));
    if (!validIds.length) {
      return next(new AppError('No valid ObjectIds provided.', 400));
    }

    // Explicitly allow 'owner' in FilterQuery
    const filter: FilterQuery<T> & { owner?: Types.ObjectId } = { _id: { $in: validIds } };
    if (requireOwner && !isSuperAdmin) {
      filter.owner = userId;
    }

    const result = await Model.deleteMany(filter);

    if (result.deletedCount === 0) {
      return next(new AppError(`No ${Model.modelName}s found or unauthorized.`, 404));
    }

    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: `${result.deletedCount} ${Model.modelName}(s) deleted successfully.`,
      data: null,
    });
  });

/**
 * Generic factory function to fetch data for dropdowns.
 * @param Model - The Mongoose Model to operate on.
 * @param fields - Fields to include in the dropdown data.
 * @param requireOwner - Whether to enforce owner-based retrieval (default: true).
 * @returns Express middleware function.
 */
export const getModelDropdownWithoutStatus = <T extends Document>(
  Model: Model<T>,
  fields: string[],
  requireOwner: boolean = true
): RequestHandler =>
  catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = requireAuth(req, Model.modelName);
    const isSuperAdmin = req.user?.role === 'superAdmin';

    // Explicitly allow 'owner' in FilterQuery
    const filter: FilterQuery<T> & { owner?: Types.ObjectId } = isSuperAdmin || !requireOwner ? {} : { owner: userId };
    const selectFields = new Set([...fields, '_id']);

    const docs = await Model.find(filter)
      .select(Array.from(selectFields).join(' '))
      .lean();

    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: `Retrieved ${docs.length} ${Model.modelName}(s) for dropdown.`,
      results: docs.length,
      data: { dropdown: docs },
    });
  });
