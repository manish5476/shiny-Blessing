import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app';

const envFile = process.argv[2] || ".env.dev";
dotenv.config({ path: envFile });

mongoose
  .connect(process.env.DATABASE!)
  .then(() => {
    console.log(`Connected to MongoDB (${process.env.NODE_ENV})`);
  })
  .catch((err: any) => {
    console.error("Database connection error:", err);
    process.exit(1);
  });

const port = process.env.PORT || 4000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port} in ${process.env.NODE_ENV} mode`);
});

async function shutdown() {
  console.log("Shutting down server...");
  await mongoose.connection.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

