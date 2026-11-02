const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:5000";

async function main() {
  const company = await fetch(`${BASE}/api/company`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
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
    }),
  }).then((r) => r.json());
  console.log("company", company._id, company.name);

  const tmp = path.join(__dirname, "sample-bill.txt");
  fs.writeFileSync(tmp, "Sample electricity bill for testing.");

  const uploaded = [];
  for (const kind of ["electricity", "fuel", "production"]) {
    const fd = new FormData();
    fd.append("companyId", company._id);
    fd.append("fileType", kind);
    fd.append(
      "file",
      new Blob([fs.readFileSync(tmp)], { type: "text/plain" }),
      `${kind}.pdf`
    );
    const res = await fetch(`${BASE}/api/upload`, { method: "POST", body: fd });
    const doc = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(doc));
    uploaded.push(doc);
    console.log("upload", kind, doc.extractedData.length, "items");
  }

  const baseline = await fetch(`${BASE}/api/emissions/${company._id}`, {
    method: "POST",
  }).then((r) => r.json());
  console.log("baseline", {
    total: baseline.totalEmissions,
    intensity: baseline.carbonIntensity,
    median: baseline.sectorMedian,
    cbam: baseline.cbamExposure,
    evidence: baseline.evidenceTrail.length,
  });

  const sim = await fetch(`${BASE}/api/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyId: company._id,
      baselineId: baseline._id,
      baselineEmissions: baseline.totalEmissions,
      budget: 22000000,
      paybackCeiling: 5,
      tariff: 8,
      tariffEscalation: 5,
      sector: "steel",
      persist: true,
    }),
  }).then((r) => r.json());

  console.log("simulation", {
    capex: sim.simulation.totalCapex,
    abated: sim.simulation.totalAbatement,
    savings: sim.simulation.totalSavings,
    payback: sim.simulation.blendedPayback,
    selected: sim.simulation.selectedInterventions.map((i) => i.id),
    excluded: sim.simulation.excludedInterventions.map((i) => i.id),
    projection: sim.simulation.projection.length,
    sensitivity: sim.sensitivity.length,
  });

  const report = await fetch(`${BASE}/api/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyId: company._id,
      baselineId: baseline._id,
      simulationId: sim.simulation._id,
    }),
  }).then((r) => r.json());

  console.log("report", report.report._id, "html bytes", report.html.length);

  const dl = await fetch(`${BASE}/api/report/download/${report.report._id}`);
  console.log("download status", dl.status, dl.headers.get("content-type"));

  fs.unlinkSync(tmp);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
