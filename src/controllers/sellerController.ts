
import {Seller} from "../models/sellerModel";

import * as handleFactory from './handleFactory';

exports.getAllSeller = handleFactory.getAll(Seller);
exports.getSellerById = handleFactory.getOne(Seller);
exports.newSeller = handleFactory.newOne(Seller);
exports.deleteSeller = handleFactory.deleteOne(Seller);
exports.updateSeller = handleFactory.updateOne(Seller);
// exports.deleteMultipleSeller = handleFactory.deleteMultipleSeller(Seller)