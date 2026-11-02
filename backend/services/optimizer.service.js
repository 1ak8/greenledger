const interventionsData = require("../data/interventions.json");
const Simulation = require("../models/Simulation.model");

function getInterventions(sector) {
  return interventionsData[sector] || interventionsData.other;
}

function solveKnapsack(interventions, budget, paybackCeiling) {
  const eligible = interventions.filter(
    (i) => i.payback <= paybackCeiling && i.capex <= budget
  );
  const n = eligible.length;

  if (n === 0) {
    return {
      selected: [],
      excluded: interventions.map((i) => ({
        id: i.id,
        name: i.name,
        reason:
          i.payback > paybackCeiling
            ? "Exceeds payback ceiling"
            : "Exceeds budget",
      })),
    };
  }

  let bestAbatement = 0;
  let bestCombo = [];

  for (let mask = 1; mask < 1 << n; mask++) {
    let totalCapex = 0;
    let totalAbatement = 0;
    const combo = [];

    for (let j = 0; j < n; j++) {
      if (mask & (1 << j)) {
        totalCapex += eligible[j].capex;
        totalAbatement += eligible[j].co2Abated;
        combo.push(eligible[j]);
      }
    }

    if (totalCapex <= budget && totalAbatement > bestAbatement) {
      bestAbatement = totalAbatement;
      bestCombo = combo;
    }
  }

  // If nothing fits, surface the cheapest single option as guidance
  const selectedIds = new Set(bestCombo.map((i) => i.id));
  const excluded = interventions
    .filter((i) => !selectedIds.has(i.id))
    .map((i) => ({
      id: i.id,
      name: i.name,
      reason:
        i.payback > paybackCeiling
          ? "Exceeds payback ceiling"
          : i.capex > budget
            ? "Exceeds budget"
            : "Lower abatement than the selected set",
    }));

  return { selected: bestCombo, excluded };
}

function buildProjection(baselineEmissions, selected, escalation, years = 5) {
  const totalAbatement = selected.reduce((s, i) => s + i.co2Abated, 0);
  const baseSavings = selected.reduce((s, i) => s + i.annualSavings, 0);
  const projection = [];
  let cumulative = 0;
  const startYear = new Date().getFullYear();
  // Mild annual efficiency gain from maintenance and operating discipline.
  const annualDrift = Math.round(baselineEmissions * 0.0008);

  for (let y = 0; y < years; y++) {
    const multiplier = Math.pow(1 + escalation / 100, y);
    const savings = Math.round(baseSavings * multiplier);
    cumulative += savings;
    projection.push({
      year: startYear + y,
      emissions: Math.max(
        0,
        Math.round(baselineEmissions - totalAbatement - annualDrift * y)
      ),
      savings,
      cumulative,
    });
  }

  return projection;
}

function sensitivityAnalysis(selected) {
  if (selected.length === 0) return [];

  const totalCapex = selected.reduce((s, i) => s + i.capex, 0);
  const baseSavings = selected.reduce((s, i) => s + i.annualSavings, 0);
  if (baseSavings === 0) return [];
  const basePayback = totalCapex / baseSavings;

  const shifts = [
    ["Power tariff +20%", baseSavings * 1.2],
    ["Power tariff −20%", baseSavings * 0.8],
    ["Capex +15%", baseSavings, totalCapex * 1.15],
    ["Capex −15%", baseSavings, totalCapex * 0.85],
    ["Utilisation −10%", baseSavings * 0.9],
  ];

  return shifts.map(([assumption, savings, capex]) => {
    const payback = (capex || totalCapex) / savings;
    return {
      assumption,
      payback: parseFloat(payback.toFixed(2)),
      delta: parseFloat((payback - basePayback).toFixed(2)),
    };
  });
}

function compute({
  baselineEmissions,
  budget,
  paybackCeiling,
  tariff,
  tariffEscalation,
  sector,
  toggles,
}) {
  const allInterventions = getInterventions(sector);

  let filtered = allInterventions;
  if (toggles && Object.keys(toggles).length > 0) {
    filtered = allInterventions.filter((i) => toggles[i.id] !== false);
  }

  const { selected, excluded } = solveKnapsack(filtered, budget, paybackCeiling);

  const totalCapex = selected.reduce((s, i) => s + i.capex, 0);
  const totalAbatement = selected.reduce((s, i) => s + i.co2Abated, 0);
  const totalSavings = selected.reduce((s, i) => s + i.annualSavings, 0);
  const blendedPayback =
    totalSavings > 0 ? parseFloat((totalCapex / totalSavings).toFixed(2)) : 0;

  return {
    budget,
    paybackCeiling,
    tariffAssumption: tariff,
    tariffEscalation,
    selectedInterventions: selected.map((i) => ({
      id: i.id,
      name: i.name,
      capex: i.capex,
      annualSavings: i.annualSavings,
      co2Abated: i.co2Abated,
      payback: i.payback,
    })),
    excludedInterventions: excluded,
    totalCapex,
    totalAbatement,
    totalSavings,
    blendedPayback,
    projection: buildProjection(
      baselineEmissions,
      selected,
      tariffEscalation
    ),
  };
}

async function runSimulation(params, persist = false) {
  const computed = compute(params);
  const sensitivity = sensitivityAnalysis(computed.selectedInterventions);

  let saved = null;
  if (persist) {
    saved = await Simulation.create({
      companyId: params.companyId,
      baselineId: params.baselineId,
      ...computed,
    });
  }

  return {
    simulation: {
      _id: saved ? saved._id : null,
      companyId: params.companyId,
      baselineId: params.baselineId,
      ...computed,
      pinned: false,
      label: "",
    },
    sensitivity,
    allInterventions: params.toggles
      ? getInterventions(params.sector).filter((i) => params.toggles[i.id] !== false)
      : getInterventions(params.sector),
  };
}

module.exports = { runSimulation, getInterventions, solveKnapsack };
