const Upload = require("../models/Upload.model");
const { extractFromFile } = require("./gemini.service");

const UNIT_MAP = {
  kwh: "kWh",
  mwh: "kWh",
  litre: "litre",
  liter: "litre",
  litres: "litre",
  liters: "litre",
  l: "litre",
  kg: "kg",
  kilogram: "kg",
  tonne: "tonnes",
  tonnes: "tonnes",
  ton: "tonnes",
  mt: "tonnes",
  m3: "m3",
  scf: "SCF",
  scm: "m3",
};

const CONVERSION = {
  mwh_to_kwh: 1000,
  scf_to_m3: 0.02832,
};

function normaliseUnit(value, rawUnit) {
  const key = rawUnit.toLowerCase().trim();
  const unit = UNIT_MAP[key] || rawUnit;

  if (key === "mwh") return { value: value * CONVERSION.mwh_to_kwh, unit: "kWh" };
  if (key === "scf") return { value: value * CONVERSION.scf_to_m3, unit: "m3" };

  return { value, unit };
}

async function processUpload(companyId, fileType, filePath, originalName) {
  const rawItems = await extractFromFile(filePath, fileType);

  const extractedData = rawItems.map((item) => {
    const norm = normaliseUnit(item.value, item.unit);
    return {
      field: item.field,
      value: norm.value,
      unit: norm.unit,
      period: item.period || "",
      sourceDoc: originalName,
      confidence: 0.9,
      manualOverride: false,
    };
  });

  const upload = await Upload.create({
    companyId,
    fileType,
    originalName,
    filePath,
    extractedData,
    status: extractedData.length > 0 ? "extracted" : "failed",
  });

  return upload;
}

module.exports = { processUpload, normaliseUnit };
