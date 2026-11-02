const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 2500 });
    global.__CARBONTWIN_STORE__ = false;
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
    return;
  } catch (err) {
    console.warn(
      `MongoDB unavailable (${err.message.split("\n")[0]}). Using the local file store.`
    );
    global.__CARBONTWIN_STORE__ = true;
  }
}

module.exports = connectDB;
