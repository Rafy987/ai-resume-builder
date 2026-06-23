import mongoose from "mongoose";

/**
 * connectDB - Establishes a connection to the MongoDB database via Mongoose.
 *
 * - Reads the connection string from the MONGODB_URI environment variable.
 * - Logs the connected host on success for easy environment verification.
 * - On failure, logs the error and calls process.exit(1) to prevent the
 *   server from running in a broken state without a database connection.
 */
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI);

    console.log(
      `\n✅ MongoDB connected! Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.error("❌ MongoDB connection FAILED:", error.message);
    // Exit the process with a failure code so the OS/process manager
    // (e.g., PM2, Docker) knows to restart or alert.
    process.exit(1);
  }
};

export { connectDB };
