const mongoose = require("mongoose");
const { collection } = require("../memory/store");

const extractedItemSchema = new mongoose.Schema(
  {
    field: String,
    value: Number,
    unit: String,
    period: String,
    sourceDoc: String,
    confidence: { type: Number, default: 1 },
    manualOverride: { type: Boolean, default: false },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    fileType: {
      type: String,
      enum: ["electricity", "fuel", "production"],
      required: true,
    },
    originalName: String,
    filePath: String,
    extractedData: [extractedItemSchema],
    status: {
      type: String,
      enum: ["pending", "extracted", "reviewed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const MongoModel = mongoose.models.Upload || mongoose.model("Upload", schema);

module.exports =
  global.__CARBONTWIN_STORE__ === true ? collection("uploads") : MongoModel;
