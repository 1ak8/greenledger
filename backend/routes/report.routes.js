const express = require("express");
const router = express.Router();
const { generateReport } = require("../services/pdf.service");
const Company = require("../models/Company.model");
const Baseline = require("../models/Baseline.model");
const Simulation = require("../models/Simulation.model");
const Report = require("../models/Report.model");
const path = require("path");
const fs = require("fs");

router.post("/", async (req, res, next) => {
  try {
    const { companyId, baselineId, simulationId } = req.body;

    const company = await Company.findById(companyId);
    const baseline = await Baseline.findById(baselineId);
    const simulation = await Simulation.findById(simulationId);

    if (!company || !baseline || !simulation) {
      return res.status(404).json({ error: "Company, baseline, or simulation not found" });
    }

    const { report, html } = await generateReport(company, baseline, simulation);
    res.json({ report, html });
  } catch (err) {
    next(err);
  }
});

router.get("/:companyId", async (req, res, next) => {
  try {
    const reports = await Report.find({ companyId: req.params.companyId }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

router.get("/download/:id", async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ error: "Report not found" });

    // If PDF is still rendering in the background, poll for up to 3.5s before falling back
    let file = report.pdfPath;
    if (!file || !fs.existsSync(file)) {
      for (let attempt = 0; attempt < 7; attempt++) {
        await new Promise((r) => setTimeout(r, 500));
        const updated = await Report.findById(req.params.id);
        if (updated && updated.pdfPath && fs.existsSync(updated.pdfPath)) {
          file = updated.pdfPath;
          break;
        }
      }
    }

    // Final fallback to HTML if PDF isn't finished
    if (!file || !fs.existsSync(file)) {
      file = report.htmlPath;
    }

    if (!file || !fs.existsSync(file)) {
      return res.status(404).json({ error: "File not found" });
    }

    const isPdf = file.toLowerCase().endsWith(".pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="GreenLedger-Report${isPdf ? ".pdf" : ".html"}"`
    );
    res.sendFile(path.resolve(file));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
