// src/types/custom.d.ts
import { Request } from 'express';
import { IUser } from '../models/UserModel'; // Adjust path as needed

export interface AuthenticatedRequest extends Request {
  user?: IUser & { _id: string }; // Attach user with _id
}
