const express = require("express");
const router = express.Router();
const Company = require("../models/Company.model");
const Upload = require("../models/Upload.model");
const Baseline = require("../models/Baseline.model");
const Simulation = require("../models/Simulation.model");
const { computeBaseline } = require("../services/emissions.service");
const { runSimulation } = require("../services/optimizer.service");

router.get("/demo", async (req, res, next) => {
  try {
    let company = await Company.findOne({ name: "Sharma Steel Pvt Ltd" });
    if (!company) {
      company = await Company.create({
        name: "Sharma Steel Pvt Ltd",
        sector: "steel",
        state: "Chhattisgarh",
        annualProduction: 18000,
        productionUnit: "tonnes",
        employees: 400,
        revenue: 120,
        exportShare: 20,
        exportDestination: "Germany",
        powerTariff: 8,
      });
    }

    let uploads = await Upload.find({ companyId: company._id });
    if (!uploads || uploads.length === 0) {
      const now = new Date();
      const thisPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevPeriod = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

      uploads = await Upload.create([
        {
          companyId: company._id,
          fileType: "electricity",
          originalName: "electricity-bill.pdf",
          filePath: "electricity-bill.pdf",
          extractedData: [
            { field: "electricity_consumed", value: 785675, unit: "kWh", period: thisPeriod, sourceDoc: "electricity-bill.pdf", confidence: 0.9, manualOverride: false },
            { field: "electricity_consumed", value: 785675, unit: "kWh", period: prevPeriod, sourceDoc: "electricity-bill.pdf", confidence: 0.9, manualOverride: false },
          ],
          status: "extracted",
        },
        {
          companyId: company._id,
          fileType: "fuel",
          originalName: "fuel-bill.pdf",
          filePath: "fuel-bill.pdf",
          extractedData: [
            { field: "coal", value: 108333, unit: "kg", period: thisPeriod, sourceDoc: "fuel-bill.pdf", confidence: 0.9, manualOverride: false },
            { field: "coal", value: 108333, unit: "kg", period: prevPeriod, sourceDoc: "fuel-bill.pdf", confidence: 0.9, manualOverride: false },
            { field: "diesel", value: 8000, unit: "litre", period: thisPeriod, sourceDoc: "fuel-bill.pdf", confidence: 0.9, manualOverride: false },
            { field: "diesel", value: 8000, unit: "litre", period: prevPeriod, sourceDoc: "fuel-bill.pdf", confidence: 0.9, manualOverride: false },
          ],
          status: "extracted",
        },
        {
          companyId: company._id,
          fileType: "production",
          originalName: "production-bill.pdf",
          filePath: "production-bill.pdf",
          extractedData: [
            { field: "production", value: 1500, unit: "tonnes", period: thisPeriod, sourceDoc: "production-bill.pdf", confidence: 0.9, manualOverride: false },
            { field: "production", value: 1500, unit: "tonnes", period: prevPeriod, sourceDoc: "production-bill.pdf", confidence: 0.9, manualOverride: false },
          ],
          status: "extracted",
        },
      ]);
    }

    let baseline = await Baseline.findOne({ companyId: company._id });
    if (!baseline) {
      baseline = await computeBaseline(company._id);
    }

    let simulation = await Simulation.findOne({ companyId: company._id });
    if (!simulation) {
      const simRes = await runSimulation(
        {
          companyId: company._id,
          baselineId: baseline._id,
          baselineEmissions: baseline.totalEmissions,
          budget: 22000000,
          paybackCeiling: 5,
          tariff: 8,
          tariffEscalation: 5,
          sector: "steel",
          toggles: {},
        },
        true
      );
      simulation = simRes.simulation;
    }

    res.json({
      company,
      baseline,
      uploads,
      simulation,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const company = await Company.create(req.body);
    res.status(201).json(company);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: "Company not found" });
    res.json(company);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
