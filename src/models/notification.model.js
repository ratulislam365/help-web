// src/models/notification.model.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  receiverRole: { type: String, enum: ["seeker", "giver", "both"], required: true },
  status: { type: String, enum: ["unread", "read"], default: "unread" },
}, { timestamps: true });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
