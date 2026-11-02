const express = require("express");
const router = express.Router();
const { computeBaseline } = require("../services/emissions.service");
const Baseline = require("../models/Baseline.model");

router.post("/:companyId", async (req, res, next) => {
  try {
    const baseline = await computeBaseline(req.params.companyId);
    res.json(baseline);
  } catch (err) {
    next(err);
  }
});

router.get("/:companyId", async (req, res, next) => {
  try {
    const baseline = await Baseline.findOne({ companyId: req.params.companyId }).sort({ createdAt: -1 });
    if (!baseline) return res.status(404).json({ error: "Baseline not found" });
    res.json(baseline);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
