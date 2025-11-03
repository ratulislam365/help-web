import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["giver", "seeker", "both"], required: true },
  action: { type: String, required: true }, // e.g., Emergency Request
  status: { type: String, enum: ["Helped", "Declined", "Pending"], required: true },
  partner: { type: String }, // other user name
  distance: { type: Number },
  date: { type: String, default: () => new Date().toISOString().split("T")[0] },
  time: { type: String, default: () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) },
}, { timestamps: true });

export default mongoose.model("History", historySchema);
