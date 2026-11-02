const express = require("express");
const router = express.Router();
const { runSimulation, getInterventions } = require("../services/optimizer.service");
const Simulation = require("../models/Simulation.model");

router.post("/", async (req, res, next) => {
  try {
    const {
      companyId, baselineId, baselineEmissions, budget,
      paybackCeiling, tariff, tariffEscalation, sector, toggles, persist,
    } = req.body;

    if (!companyId || !budget) {
      return res.status(400).json({ error: "companyId and budget are required" });
    }

    const result = await runSimulation(
      {
        companyId,
        baselineId,
        baselineEmissions: baselineEmissions || 0,
        budget,
        paybackCeiling: paybackCeiling || 5,
        tariff: tariff || 8,
        tariffEscalation: tariffEscalation ?? 5,
        sector: sector || "steel",
        toggles: toggles || {},
      },
      persist === true
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/interventions/:sector", async (req, res, next) => {
  try {
    res.json(getInterventions(req.params.sector));
  } catch (err) {
    next(err);
  }
});

router.get("/:companyId", async (req, res, next) => {
  try {
    const sims = await Simulation.find({ companyId: req.params.companyId }).sort({ createdAt: -1 });
    res.json(sims);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/pin", async (req, res, next) => {
  try {
    const sim = await Simulation.findByIdAndUpdate(
      req.params.id,
      { pinned: true, label: req.body.label || "" },
      { new: true }
    );
    if (!sim) return res.status(404).json({ error: "Simulation not found" });
    res.json(sim);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
