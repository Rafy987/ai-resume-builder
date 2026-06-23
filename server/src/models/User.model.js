import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

/**
 * User Schema
 *
 * Defines the shape of user documents in MongoDB.
 * Includes plan-based generation limits and secure password handling.
 */
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      // Prevents password from being returned in any query by default.
      // Must be explicitly selected with: User.findOne({}).select("+password")
      select: false,
    },

    plan: {
      type: String,
      enum: {
        values: ["free", "pro", "enterprise"],
        message: "Plan must be one of: free, pro, enterprise",
      },
      default: "free",
    },

    // Tracks how many AI resume generations the user has used in the current cycle
    generationsUsed: {
      type: Number,
      default: 0,
    },

    // The maximum number of AI generations allowed based on the user's plan
    generationLimit: {
      type: Number,
      default: 3, // Free tier default
    },

    // Timestamp for when the generation count was last reset (e.g., monthly)
    generationsResetDate: {
      type: Date,
      default: () => {
        const date = new Date();
        // Default reset cycle: 30 days from account creation
        date.setDate(date.getDate() + 30);
        return date;
      },
    },

    // For optional OAuth or passwordless flows in future phases
    googleId: {
      type: String,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    refreshToken: {
      type: String,
      select: false, // Never expose refresh tokens in queries
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` fields
    timestamps: true,
  }
);

/**
 * Pre-save hook: Hash the password before saving if it has been modified.
 *
 * Using bcrypt with a salt round of 10.
 * We check `isModified("password")` to avoid re-hashing on unrelated updates
 * (e.g., updating the user's name or plan).
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/**
 * Instance Method: isPasswordCorrect
 *
 * Compares a plain-text candidate password against the stored bcrypt hash.
 * Returns true if they match, false otherwise.
 *
 * @param {string} candidatePassword - The plain-text password from the login request
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordCorrect = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model("User", userSchema);
