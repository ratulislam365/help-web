import User from '../models/user.model.js';
import AppError from "../utils/appError.js";


export default class UserRepository {
  // 🔍 Find user by email (with optional select fields)
  static async findByEmail(email, select) {
    const query = User.findOne({ email });
    if (select) {
      query.select(select);
    }
    return await query;
  }

  // 🔍 Find user by ID
  static async findById(id) {
    return await User.findById(id);
  }

  // 🔐 Find user with password (used during login)
  static async findUserWithPasswordByEmail(email) {
    return await User.findOne({ email }).select('+password');
  }

  // ➕ Create new user
  static async create(userData) {
    return await User.create(userData);
  }

  // 🔄 Update user by ID
  static async updateById(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  // ❌ Delete user by ID
  static async deleteById(id) {
    return await User.findByIdAndDelete(id);
  }

  // 📋 Get all users (optional filters)
  static async findAll(filter = {}, select) {
    const query = User.find(filter);
    if (select) query.select(select);
    return await query;
  }
}


// src/repositories/user.repository.js
// import User from "../models/user.model.js";

export const findUserById = async (id) => {
  return await User.findById(id).select("-__v -password");
};
