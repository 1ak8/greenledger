const mongoose = require("mongoose");
const { collection } = require("../memory/store");

const interventionSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    capex: Number,
    annualSavings: Number,
    co2Abated: Number,
    payback: Number,
  },
  { _id: false }
);

const projectionSchema = new mongoose.Schema(
  {
    year: Number,
    emissions: Number,
    savings: Number,
    cumulative: Number,
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    baselineId: { type: mongoose.Schema.Types.ObjectId, ref: "Baseline" },
    budget: { type: Number, required: true },
    paybackCeiling: { type: Number, default: 5 },
    tariffAssumption: { type: Number, default: 8 },
    tariffEscalation: { type: Number, default: 5 },
    selectedInterventions: [interventionSchema],
    excludedInterventions: [{ id: String, name: String, reason: String }],
    totalCapex: Number,
    totalAbatement: Number,
    totalSavings: Number,
    blendedPayback: Number,
    projection: [projectionSchema],
    pinned: { type: Boolean, default: false },
    label: { type: String, default: "" },
  },
  { timestamps: true }
);

const MongoModel =
  mongoose.models.Simulation || mongoose.model("Simulation", schema);

module.exports =
  global.__CARBONTWIN_STORE__ === true ? collection("simulations") : MongoModel;
