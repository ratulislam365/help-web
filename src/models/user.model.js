 import mongoose from 'mongoose';
 import bcrypt from 'bcryptjs';
 import jwt from 'jsonwebtoken';
 import crypto from 'crypto';
 




const userSchema = new mongoose.Schema({
  fullname: {
    type: String,
    required: [true, 'Fullname is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  phonenumber: {
    type: String,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationOtp: { type: String, select: false },
  emailVerificationOtpExpires: { type: Date, select: false },
  passwordResetOtp: { type: String, select: false },
  passwordResetOtpExpires: { type: Date, select: false },

  // 🆕 Role field for help system
  role: {
    type: String,
    enum: ["seeker", "giver", "both"],
    default: "seeker",
  },
  profileImage: {
    type: String,
    default: "https://cdn.app/default-avatar.png",
  },

  // 🆕 Updated GeoJSON location field
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false,
      default: [0, 0]
    },
  },

}, { timestamps: true });

// 🔍 Create 2dsphere index for GeoSpatial queries

userSchema.index({ location: "2dsphere" });


// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare user password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT
userSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// Generate Refresh Token
userSchema.methods.getRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
  });
};

// Generate OTP
userSchema.methods.generateOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  return { otp, otpExpires };
};

export default mongoose.model('User', userSchema);


