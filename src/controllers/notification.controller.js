// // src/controllers/notification.controller.js
 import Notification from "../models/notification.model.js";

export const getNotifications = async (req, res) => {
  try {
    const role = req.query.role; // query param থেকে role নেওয়া
    if (!role || !["seeker", "giver", "both"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const notifications = await Notification.find({ receiverRole: role })
      .populate("sender", "fullname profileImage") // sender এর নাম এবং photo দেখাবে
      .sort({ createdAt: -1 }); // নতুন notification উপরে

    res.status(200).json({
      success: true,
      data: notifications.map(n => ({
        id: n._id,
        message: n.message,
        sender: n.sender,
        status: n.status,
        timestamp: n.createdAt,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};



// src/controllers/notification.controller.js

export const createNotification = async (req, res) => {
  try {
    const { message, receiverRole, senderId } = req.body;

    const notification = await Notification.create({
      message,
      receiverRole,
      sender: senderId,
      status: "unread"
    });

    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
