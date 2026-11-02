const emissionFactors = require("../data/emission_factors.json");
const benchmarks = require("../data/benchmarks.json");
const Upload = require("../models/Upload.model");
const Company = require("../models/Company.model");
const Baseline = require("../models/Baseline.model");

const MONTHS_PER_YEAR = 12;
const EUR_TO_INR = 97;

function getGridFactor(state) {
  const key = state.toLowerCase().replace(/\s+/g, "_");
  return emissionFactors.grid.states[key] || emissionFactors.grid.national_average;
}

function getFuelFactor(fuelType) {
  const fuel = emissionFactors.fuels[fuelType];
  return fuel ? fuel.factor : 0;
}

function getSectorBenchmark(sector) {
  return benchmarks[sector] || benchmarks.other;
}

/** Annualise a single document by its own distinct periods, not the whole set. */
function annualFactorFor(upload) {
  const periods = new Set(
    upload.extractedData.map((d) => d.period).filter(Boolean)
  );
  const months = periods.size;
  if (months === 0 || months >= MONTHS_PER_YEAR) return 1;
  return MONTHS_PER_YEAR / months;
}

async function computeBaseline(companyId) {
  const company = await Company.findById(companyId);
  if (!company) throw new Error("Company not found");

  const uploads = await Upload.find({
    companyId,
    status: { $in: ["extracted", "reviewed"] },
  });

  const evidenceTrail = [];
  let scope1 = 0;
  let scope2 = 0;
  const gridFactor = getGridFactor(company.state);

  for (const upload of uploads) {
    const factor = annualFactorFor(upload);

    for (const item of upload.extractedData) {
      if (item.field === "electricity_consumed") {
        const mwh = (item.value / 1000) * factor;
        const co2 = mwh * gridFactor;
        scope2 += co2;
        evidenceTrail.push({
          figure: `Electricity ${item.value.toLocaleString("en-IN")} kWh · ${item.period || "annual"} × ${gridFactor} tCO₂e/MWh`,
          value: co2,
          unit: "tCO2e",
          sourceUploadId: upload._id,
          emissionFactorId: `grid.${company.state.toLowerCase().replace(/\s+/g, "_")}`,
          calculation: `${item.value.toLocaleString("en-IN")} kWh ÷ 1000 × ${factor} (annualisation) × ${gridFactor} = ${co2.toFixed(2)} tCO₂e`,
        });
      } else if (item.field === "production") {
        continue;
      } else {
        const fuelFactor = getFuelFactor(item.field);
        if (fuelFactor > 0) {
          const co2 = ((item.value * factor) * fuelFactor) / 1000;
          scope1 += co2;
          evidenceTrail.push({
            figure: `${item.field} ${item.value.toLocaleString("en-IN")} ${item.unit} · ${item.period || "annual"} × ${fuelFactor} kgCO₂e/${item.unit}`,
            value: co2,
            unit: "tCO2e",
            sourceUploadId: upload._id,
            emissionFactorId: `fuel.${item.field}`,
            calculation: `${item.value.toLocaleString("en-IN")} ${item.unit} × ${factor} (annualisation) × ${fuelFactor} ÷ 1000 = ${co2.toFixed(2)} tCO₂e`,
          });
        }
      }
    }
  }

  // Process emissions for the sector
  const processKey = `${company.sector}_if_scrap`;
  const process = emissionFactors.process[processKey];
  if (process) {
    const processEmissions = company.annualProduction * process.factor;
    scope1 += processEmissions;
    evidenceTrail.push({
      figure: `Process ${company.annualProduction.toLocaleString("en-IN")} t × ${process.factor} tCO₂e/t`,
      value: processEmissions,
      unit: "tCO2e",
      sourceUploadId: null,
      emissionFactorId: `process.${processKey}`,
      calculation: `${company.annualProduction.toLocaleString("en-IN")} t × ${process.factor} = ${processEmissions.toFixed(2)} tCO₂e`,
    });
  }

  const totalEmissions = scope1 + scope2;
  const carbonIntensity =
    company.annualProduction > 0 ? totalEmissions / company.annualProduction : 0;
  const benchmark = getSectorBenchmark(company.sector);

  const exportTonnage = company.annualProduction * (company.exportShare / 100);
  const euCarbonPrice = 70;
  const cbamExposure = Math.round(
    exportTonnage * carbonIntensity * euCarbonPrice * EUR_TO_INR
  );

  const baseline = await Baseline.findOneAndUpdate(
    { companyId },
    {
      companyId,
      scope1: Math.round(scope1),
      scope2: Math.round(scope2),
      scope3: 0,
      totalEmissions: Math.round(totalEmissions),
      carbonIntensity: parseFloat(carbonIntensity.toFixed(2)),
      sectorMedian: benchmark.median_intensity,
      cbamExposure,
      euCarbonPrice,
      evidenceTrail,
    },
    { upsert: true, new: true }
  );

  return baseline;
}

module.exports = { computeBaseline, getGridFactor, getSectorBenchmark };
