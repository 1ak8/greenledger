const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GEMINI_API_KEY } = require("../config/env");
const fs = require("fs");
const path = require("path");

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const EXTRACTION_PROMPT = `You are a document data extractor for Indian industrial utility bills.
Extract structured data from the uploaded document. Return ONLY valid JSON.

For electricity bills extract: { items: [{ field: "electricity_consumed", value: <number>, unit: "kWh", period: "YYYY-MM" }] }
For fuel invoices extract: { items: [{ field: "<fuel_type>", value: <number>, unit: "<litre|kg|m3|SCF>", period: "YYYY-MM" }] }
  fuel_type can be: diesel, furnace_oil, natural_gas, coal, pet_coke, lpg, biomass_briquette
For production records extract: { items: [{ field: "production", value: <number>, unit: "tonnes", period: "YYYY-MM" }] }

Rules:
- Convert all quantities to standard units (kWh, litres, kg, m3, tonnes)
- If period is not clear, use the document date
- If multiple line items exist, return each separately
- Return ONLY the JSON object, no markdown, no explanation`;

async function extractFromFile(filePath, fileType) {
  if (!GEMINI_API_KEY) {
    return generateMockData(fileType);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString("base64");
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === ".pdf" ? "application/pdf" : "image/jpeg";

    const result = await model.generateContent([
      EXTRACTION_PROMPT + `\n\nDocument type hint: ${fileType}`,
      { inlineData: { data: base64, mimeType } },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return generateMockData(fileType);

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.items || [];
  } catch (err) {
    console.error("Gemini extraction error:", err.message);
    return generateMockData(fileType);
  }
}

function generateMockData(fileType) {
  const now = new Date();
  const thisPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevPeriod = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;

  switch (fileType) {
    case "electricity":
      return [
        { field: "electricity_consumed", value: 785675, unit: "kWh", period: thisPeriod },
        { field: "electricity_consumed", value: 785675, unit: "kWh", period: prevPeriod },
      ];
    case "fuel":
      return [
        { field: "coal", value: 108333, unit: "kg", period: thisPeriod },
        { field: "coal", value: 108333, unit: "kg", period: prevPeriod },
        { field: "diesel", value: 8000, unit: "litre", period: thisPeriod },
        { field: "diesel", value: 8000, unit: "litre", period: prevPeriod },
      ];
    case "production":
      return [
        { field: "production", value: 1500, unit: "tonnes", period: thisPeriod },
        { field: "production", value: 1500, unit: "tonnes", period: prevPeriod },
      ];
    default:
      return [];
  }
}

module.exports = { extractFromFile };
