const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/carbontwin",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  JWT_SECRET: process.env.JWT_SECRET || "carbontwin_secret",
  CORS_ORIGINS: process.env.CORS_ORIGINS || "http://localhost:3000",
  UPLOAD_DIR: process.env.UPLOAD_DIR || "./uploads",
  MAX_UPLOAD_MB: parseInt(process.env.MAX_UPLOAD_MB || "10", 10),
};
