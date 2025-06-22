"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModelDropdownWithoutStatus = exports.deleteMultiple = exports.getAll = exports.getOne = exports.newOne = exports.updateOne = exports.deleteOne = void 0;
const mongoose_1 = require("mongoose");
const catchAsyncModule_1 = require("../utils/catchAsyncModule");
const appError_1 = __importDefault(require("../utils/appError")); // Assuming this exists
const ApiFeatures_1 = require("../utils/ApiFeatures"); // Ensure this is correctly imported if it's a separate file
const validateObjectId = (id, resource) => {
    if (!mongoose_1.Types.ObjectId.isValid(id)) {
        throw new appError_1.default(`Invalid ${resource} ID: ${id}`, 400);
    }
    return new mongoose_1.Types.ObjectId(id);
};
const requireAuth = (req, resource) => {
    if (!req.user || !req.user._id) {
        throw new appError_1.default(`Authentication required to access ${resource}.`, 401);
    }
    return req.user._id;
};
const deleteOne = (Model, requireOwner = true) => (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const userId = requireAuth(req, Model.modelName);
    const id = validateObjectId(req.params.id, Model.modelName);
    const filter = { _id: id };
    if (requireOwner && req.user?.role !== 'superAdmin') {
        filter.owner = userId;
    }
    const doc = await Model.findOneAndDelete(filter);
    if (!doc) {
        return next(new appError_1.default(`${Model.modelName} not found or unauthorized.`, 404));
    }
    res.status(204).json({
        status: 'success',
        statusCode: 204,
        message: `${Model.modelName} deleted successfully.`,
        data: null,
    });
});
exports.deleteOne = deleteOne;
const updateOne = (Model, requireOwner = true) => (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const userId = requireAuth(req, Model.modelName);
    const id = validateObjectId(req.params.id, Model.modelName);
    // Explicitly allow 'owner' in FilterQuery if requireOwner is true
    const filter = { _id: id };
    if (requireOwner && req.user?.role !== 'superAdmin') {
        filter.owner = userId;
    }
    const doc = await Model.findOneAndUpdate(filter, req.body, {
        new: true,
        runValidators: true,
        context: 'query', // Important for pre/post hooks to correctly recognize the context
    });
    if (!doc) {
        return next(new appError_1.default(`${Model.modelName} not found or unauthorized.`, 404));
    }
    res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: `${Model.modelName} updated successfully.`,
        data: doc,
    });
});
exports.updateOne = updateOne;
/**
 * Generic factory function to create a new document.
 * @param Model - The Mongoose Model to operate on.
 * @param requireOwner - Whether to assign the owner field (default: true).
 * @returns Express middleware function.
 */
const newOne = (Model, requireOwner = true) => (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const userId = requireAuth(req, Model.modelName);
    // Use a partial type for docData to ensure 'owner' can be added.
    // If T extends Document<any, any, any, any> & { owner?: Types.ObjectId },
    // this becomes cleaner. For now, using 'any' for docData.
    const docData = { ...req.body };
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
exports.newOne = newOne;
/**
 * Generic factory function to get a single document by ID.
 * @param Model - The Mongoose Model to operate on.
 * @param autoPopulateOptions - Optional fields to populate.
 * @param requireOwner - Whether to enforce owner-based retrieval (default: true).
 * @returns Express middleware function.
 */
const getOne = (Model, autoPopulateOptions, requireOwner = true) => (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const userId = requireAuth(req, Model.modelName);
    const id = validateObjectId(req.params.id, Model.modelName);
    // Explicitly allow 'owner' in FilterQuery if requireOwner is true
    const filter = { _id: id };
    if (requireOwner && req.user?.role !== 'superAdmin') {
        filter.owner = userId;
    }
    let query = Model.findOne(filter);
    if (autoPopulateOptions) {
        if (typeof autoPopulateOptions === 'string') {
            query = query.populate({ path: autoPopulateOptions });
        }
        else if (Array.isArray(autoPopulateOptions)) {
            const normalizedPopulateOptions = autoPopulateOptions.map((option) => typeof option === 'string' ? { path: option } : option);
            query = query.populate(normalizedPopulateOptions);
        }
        else {
            query = query.populate(autoPopulateOptions);
        }
    }
    const doc = await query;
    if (!doc) {
        return next(new appError_1.default(`${Model.modelName} not found or unauthorized.`, 404));
    }
    res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: `${Model.modelName} retrieved successfully.`,
        data: doc,
    });
});
exports.getOne = getOne;
/**
 * Generic factory function to get all documents.
 * @param Model - The Mongoose Model to operate on.
 * @param requireOwner - Whether to enforce owner-based retrieval (default: true).
 * @returns Express middleware function.
 */
const getAll = (Model, requireOwner = true) => (0, catchAsyncModule_1.catchAsync)(async (req, res) => {
    const userId = requireAuth(req, Model.modelName);
    const isSuperAdmin = req.user?.role === 'superAdmin';
    // Explicitly allow 'owner' in FilterQuery
    const filter = isSuperAdmin || !requireOwner ? {} : { owner: userId };
    const combinedFilter = { ...filter, ...req.query };
    const features = new ApiFeatures_1.ApiFeatures(Model.find(combinedFilter), req.query); // Pass combinedFilter to find()
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
exports.getAll = getAll;
/**
 * Generic factory function to delete multiple documents by IDs.
 * @param Model - The Mongoose Model to operate on.
 * @param requireOwner - Whether to enforce owner-based deletion (default: true).
 * @returns Express middleware function.
 */
const deleteMultiple = (Model, requireOwner = true) => (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const { ids } = req.body;
    const userId = requireAuth(req, Model.modelName);
    const isSuperAdmin = req.user?.role === 'superAdmin';
    if (!Array.isArray(ids) || ids.length === 0) {
        return next(new appError_1.default('No valid IDs provided for deletion.', 400));
    }
    const validIds = ids
        .filter((id) => mongoose_1.Types.ObjectId.isValid(id))
        .map((id) => new mongoose_1.Types.ObjectId(id));
    if (!validIds.length) {
        return next(new appError_1.default('No valid ObjectIds provided.', 400));
    }
    // Explicitly allow 'owner' in FilterQuery
    const filter = { _id: { $in: validIds } };
    if (requireOwner && !isSuperAdmin) {
        filter.owner = userId;
    }
    const result = await Model.deleteMany(filter);
    if (result.deletedCount === 0) {
        return next(new appError_1.default(`No ${Model.modelName}s found or unauthorized.`, 404));
    }
    res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: `${result.deletedCount} ${Model.modelName}(s) deleted successfully.`,
        data: null,
    });
});
exports.deleteMultiple = deleteMultiple;
/**
 * Generic factory function to fetch data for dropdowns.
 * @param Model - The Mongoose Model to operate on.
 * @param fields - Fields to include in the dropdown data.
 * @param requireOwner - Whether to enforce owner-based retrieval (default: true).
 * @returns Express middleware function.
 */
const getModelDropdownWithoutStatus = (Model, fields, requireOwner = true) => (0, catchAsyncModule_1.catchAsync)(async (req, res, next) => {
    const userId = requireAuth(req, Model.modelName);
    const isSuperAdmin = req.user?.role === 'superAdmin';
    // Explicitly allow 'owner' in FilterQuery
    const filter = isSuperAdmin || !requireOwner ? {} : { owner: userId };
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
exports.getModelDropdownWithoutStatus = getModelDropdownWithoutStatus;
//# sourceMappingURL=handleFactory.js.map