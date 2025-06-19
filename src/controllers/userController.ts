const User = require("../Models/UserModel");
const catchAsync = require("../utils/catchAsyncModule");
const AppError = require("../utils/appError");
const handleFactory = require("./handleFactory");

const filterObj = (obj, ...allowedFields) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => allowedFields.includes(key))
  );
};

const createSendToken = (user, statusCode, res) => {
  res.status(statusCode).json({
    status: "success",
    data: { user: user || null },
  });
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError("Use dedicated password update route", 400));
  }

  const filteredBody = filterObj(req.body, "name", "email");
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  createSendToken(updatedUser, 200, res);
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });
  res.status(204).json({ status: "success", data: null });
});

// Factory handlers
exports.getAllUsers = handleFactory.getAll(User);
exports.getUserById = handleFactory.getOne(User);
exports.deleteUser = handleFactory.deleteOne(User);
exports.updateUser = handleFactory.updateOne(User);
