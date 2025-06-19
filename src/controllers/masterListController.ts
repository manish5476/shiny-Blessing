const handleFactory = require("./handleFactory");
const Product = require("../Models/productModel");
const User = require("../Models/UserModel");
const Seller = require("../Models/Seller");
const catchAsync = require("../utils/catchAsyncModule");
const Customer = require("../Models/customerModel");
const Payment = require("../Models/paymentModel");
const Invoice = require("../Models/invoiceModel");
const AppError = require("../utils/appError");

const formatResponse = (data, label) => {
  return data.map(item => ({
    id: item._id,
    label: item[label] || item.name || item.title || item.fullname || item.shopname,
    ...item.toObject()
  }));
};

exports.getMasterList = catchAsync(async (req, res, next) => {
  const isSuperAdmin = req.user && req.user.role === 'superAdmin';
  const userId = req.user ? req.user._id : null;

  const ownerFilter = isSuperAdmin ? {} : { owner: userId };

  const productPromise = Product.find(ownerFilter).select('title sku _id');
  const sellersPromise = Seller.find(ownerFilter).select('name shopname _id');
  const customerPromise = Customer.find(ownerFilter).select('fullname phoneNumbers _id');
  const paymentsDropPromise = Payment.find(ownerFilter).select('customerId customerName phoneNumbers _id');
  const invoiceDataPromise = Invoice.find(ownerFilter).select('invoiceNumber seller buyer _id');
  const userPromise = User.find().select('name email _id');

  const [productsdrop, customersdrop, usersdrop, sellersdrop, Paymentdrop, InvoiceDrop] = await Promise.all([
    productPromise,
    customerPromise,
    userPromise,
    sellersPromise,
    paymentsDropPromise,
    invoiceDataPromise
  ]);

  res.status(200).json({
    status: 'success',
    statusCode: 200,
    data: {
      productsdrop,
      customersdrop,
      usersdrop,
      sellersdrop,
      Paymentdrop,
      InvoiceDrop
    },
  });
});

exports.getModuleMasterList = catchAsync(async (req, res, next) => {
  const { module } = req.params;

  const isSuperAdmin = req.user && req.user.role === 'superAdmin';
  const userId = req.user ? req.user._id : null;

  const ownerFilter = isSuperAdmin ? {} : { owner: userId };

  let query;
  let selectFields;
  let currentModuleOwnerFilter = ownerFilter;

  switch(module.toLowerCase()) {
    case 'products':
      query = Product;
      selectFields = 'title sku _id category brand price stock';
      break;
    case 'users':
      query = User;
      selectFields = 'name email _id role department';
      currentModuleOwnerFilter = {};
      break;
    case 'sellers':
      query = Seller;
      selectFields = 'name shopname _id email phone';
      break;
    case 'customers':
      query = Customer;
      selectFields = 'fullname phoneNumbers _id mobileNumber email address guaranteerId';
      break;
    case 'payments':
      query = Payment;
      selectFields = 'customerId customerName phoneNumbers amount status';
      break;
    case 'invoices':
      query = Invoice;
      selectFields = 'invoiceNumber seller buyer totalAmount status date';
      break;
    default:
      return next(new AppError('Invalid module specified', 400));
  }

  const data = await query.find(currentModuleOwnerFilter).select(selectFields);
  const formattedData = formatResponse(data,
    module === 'products' ? 'title' :
    module === 'users' ? 'name' :
    module === 'sellers' ? 'shopname' :
    module === 'customers' ? 'fullname' :
    module === 'payments' ? 'customerName' : 'invoiceNumber'
  );

  res.status(200).json({
    status: 'success',
    data: formattedData
  });
});

exports.searchMasterList = catchAsync(async (req, res, next) => {
  const { module, search } = req.query;

  if (!module || !search) {
    return next(new AppError('Module and search term are required', 400));
  }

  const isSuperAdmin = req.user && req.user.role === 'superAdmin';
  const userId = req.user ? req.user._id : null;

  const ownerFilter = isSuperAdmin ? {} : { owner: userId };

  let query;
  let searchFields;
  let currentModuleOwnerFilter = ownerFilter;

  switch(module.toLowerCase()) {
    case 'products':
      query = Product;
      searchFields = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } }
        ]
      };
      break;
    case 'users':
      query = User;
      searchFields = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };
      currentModuleOwnerFilter = {};
      break;
    case 'sellers':
      query = Seller;
      searchFields = {
        $or: [
          { shopname: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ]
      };
      break;
    case 'customers':
      query = Customer;
      searchFields = {
        $or: [
          { fullname: { $regex: search, $options: 'i' } },
          { 'phoneNumbers.number': { $regex: search, $options: 'i' } }
        ]
      };
      break;
    case 'payments':
      query = Payment;
      searchFields = {
        $or: [
          { customerName: { $regex: search, $options: 'i' } },
          { 'phoneNumbers.number': { $regex: search, $options: 'i' } }
        ]
      };
      break;
    case 'invoices':
      query = Invoice;
      searchFields = {
        $or: [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { 'seller.name': { $regex: search, $options: 'i' } },
          { 'buyer.fullname': { $regex: search, $options: 'i' } }
        ]
      };
      break;
    default:
      return next(new AppError('Invalid module specified', 400));
  }

  const finalFilter = { ...currentModuleOwnerFilter, ...searchFields };

  const data = await query.find(finalFilter);
  const formattedData = formatResponse(data,
    module === 'products' ? 'title' :
    module === 'users' ? 'name' :
    module === 'sellers' ? 'shopname' :
    module === 'customers' ? 'fullname' :
    module === 'payments' ? 'customerName' : 'invoiceNumber'
  );

  res.status(200).json({
    status: 'success',
    data: formattedData
  });
}); 