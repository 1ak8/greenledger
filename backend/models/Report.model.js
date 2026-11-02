const mongoose = require("mongoose");
const { collection } = require("../memory/store");

const schema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    baselineId: { type: mongoose.Schema.Types.ObjectId, ref: "Baseline" },
    simulationId: { type: mongoose.Schema.Types.ObjectId, ref: "Simulation" },
    pdfPath: String,
    htmlPath: String,
    status: {
      type: String,
      enum: ["generating", "ready", "failed"],
      default: "generating",
    },
  },
  { timestamps: true }
);

const MongoModel = mongoose.models.Report || mongoose.model("Report", schema);

module.exports =
  global.__CARBONTWIN_STORE__ === true ? collection("reports") : MongoModel;
