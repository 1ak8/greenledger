const mongoose = require("mongoose");
const { collection } = require("../memory/store");

const evidenceSchema = new mongoose.Schema(
  {
    figure: String,
    value: Number,
    unit: String,
    sourceUploadId: { type: mongoose.Schema.Types.ObjectId, ref: "Upload" },
    emissionFactorId: String,
    calculation: String,
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    scope1: { type: Number, default: 0 },
    scope2: { type: Number, default: 0 },
    scope3: { type: Number, default: 0 },
    totalEmissions: { type: Number, required: true },
    carbonIntensity: { type: Number, required: true },
    sectorMedian: { type: Number, required: true },
    cbamExposure: { type: Number, default: 0 },
    euCarbonPrice: { type: Number, default: 70 },
    evidenceTrail: [evidenceSchema],
  },
  { timestamps: true }
);

const MongoModel = mongoose.models.Baseline || mongoose.model("Baseline", schema);

module.exports =
  global.__CARBONTWIN_STORE__ === true ? collection("baselines") : MongoModel;
