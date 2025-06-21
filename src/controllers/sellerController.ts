import {Seller} from "../models/sellerModel";

import * as handleFactory from './handleFactory';

export const getAllSeller = handleFactory.getAll(Seller);
export const getSellerById = handleFactory.getOne(Seller);
export const newSeller = handleFactory.newOne(Seller);
export const deleteSeller = handleFactory.deleteOne(Seller);
export const updateSeller = handleFactory.updateOne(Seller);
// exports.deleteMultipleSeller = handleFactory.deleteMultipleSeller(Seller)