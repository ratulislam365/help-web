import mongoose from "mongoose";

const helperSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  status: {
    type: String,
    enum: ["pending", "enroute", "arrived", "completed", "cancelled"],
    default: "pending",
  },
  lastLocation: {
    lat: { type: Number },
    lng: { type: Number },
    updatedAt: { type: Date },
  },
  distance: { type: Number }, // কিলোমিটারে
  eta: { type: String }, // "5 mins" ইত্যাদি
});

const helpRequestSchema = new mongoose.Schema(
  {
    seeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // 🔹 এখন giver এর বদলে multiple helpers সাপোর্ট করবে
    helpers: [helperSchema],

    // 🔹 Seeker এর মূল অবস্থান
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },

    message: { type: String },

    // 🔹 Request এর overall status
    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true }
);

// 🔹 GeoSpatial index for near queries
helpRequestSchema.index({ location: "2dsphere" });

export default mongoose.model("HelpRequest", helpRequestSchema);
