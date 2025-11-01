
// src/controllers/user.controller.js
import { findUserById } from "../repositories/user.repository.js";
import AppError from "../utils/appError.js";

// src/controllers/user.controller.js
import User from "../models/user.model.js";

export const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.params.id;

    const user = await findUserById(userId);
    if (!user) return next(new AppError("User not found", 404));

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// src/controllers/user.controller.js

export const changeRole = async (req, res) => {
  const { role } = req.body;
  const validRoles = ["seeker", "giver", "both"];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  try {
    req.user.role = role; // JWT দিয়ে আসা current user
    await req.user.save();

    return res.status(200).json({
      success: true,
      message: "Role updated successfully",
      data: {
        _id: req.user._id,
        role: req.user.role,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};