const mongoose = require("mongoose");

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.log("Notice: No MONGO_URI specified. Checking for Upstash or in-memory fallback...".yellow);
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`Mongo DB Connected: ${conn.connection.host}`.cyan.underline);
  } catch (error) {
    console.log(`MongoDB connection notice: ${error.message}`.yellow);
    console.log("App will operate using Upstash / in-memory mode without crashing.".yellow);
  }
};

module.exports = connectDB;
