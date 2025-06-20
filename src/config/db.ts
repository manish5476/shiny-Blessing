
import mongoose from 'mongoose';
import dotenv from 'dotenv';

const envFile = process.argv[2] || '.env'; // Default to .env if no argument
dotenv.config({ path: envFile });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!); // Remove deprecated options
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// // export default connectDB;
// import retry from 'async-retry';
// import mongoose from 'mongoose';

// const connectDB = async () => {
//   await retry(
//     async () => {
//       await mongoose.connect(process.env.MONGO_URI!);
//       console.log('MongoDB connected successfully');
//     },
//     {
//       retries: 5,
//       factor: 2,
//       minTimeout: 1000,
//       maxTimeout: 5000,
//       onRetry: (err) => console.warn('Retrying MongoDB connection:', err.message),
//     }
//   ).catch((err) => {
//     console.error('MongoDB connection failed after retries:', err);
//     process.exit(1);
//   });
// };

// // // const mongoose = require("mongoose");
// // // require("dotenv").config(); // Make sure to include dotenv to use environment variables

// // // const connectDB = async () => {
// // //   try {
// // //     await mongoose.connect(process.env.MONGO_URI, {
// // //       useNewUrlParser: true,
// // //       useUnifiedTopology: true,
// // //       useCreateIndex: true, // Optional for deprecation warnings
// // //       useFindAndModify: false, // Optional for deprecation warnings
// // //     });
// // //     // console.log("MongoDB connected successfully");
// // //   } catch (err) {
// // //     console.error("MongoDB connection error:", err);
// // //     process.exit(1); // Exit process with failure code
// // //   }
// // // };

// // // connectDB();