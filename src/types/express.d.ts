// src/types/express.d.ts

// Import necessary types from express and your user model
import { Request } from 'express';
import { IUser } from '../models/UserModel'; // Adjust path if your UserModel is elsewhere

// Declare global namespace augmentation for Express
declare global {
  namespace Express {
    // Augment the Request interface
    interface Request {
      /**
       * The authenticated user object, typically set by an authentication middleware.
       * @type {IUser}
       */
      user?: IUser; // '?' means it's optional, as not all routes might have a user.
                    // If your 'protect' middleware guarantees it, you can remove '?' in controllers.

      /**
       * Multer's file object, for single file uploads (e.g., `upload.single('image')`).
       * @type {Express.Multer.File}
       */
      file?: Express.Multer.File;

      /**
       * Multer's files object, for multiple file uploads (e.g., `upload.array('images')` or `upload.fields(...)`).
       * @type {Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] }}
       */
      files?: {
        [fieldname: string]: Express.Multer.File[];
      } | Express.Multer.File[];
    }
  }
}