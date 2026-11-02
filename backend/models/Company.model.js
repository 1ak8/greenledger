const mongoose = require("mongoose");
const { collection } = require("../memory/store");

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sector: {
      type: String,
      required: true,
      enum: [
        "steel",
        "cement",
        "textile",
        "chemical",
        "auto-component",
        "foundry",
        "paper",
        "other",
      ],
    },
    state: { type: String, required: true },
    annualProduction: { type: Number, required: true },
    productionUnit: { type: String, default: "tonnes" },
    employees: Number,
    revenue: Number,
    exportShare: { type: Number, default: 0, min: 0, max: 100 },
    exportDestination: { type: String, default: "" },
    powerTariff: { type: Number, required: true },
  },
  { timestamps: true }
);

const MongoModel = mongoose.models.Company || mongoose.model("Company", schema);

module.exports =
  global.__CARBONTWIN_STORE__ === true ? collection("companies") : MongoModel;
