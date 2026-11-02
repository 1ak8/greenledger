const path = require("path");
const fs = require("fs");
const Report = require("../models/Report.model");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);

function findBrowser() {
  return CHROME_CANDIDATES.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
}

async function renderPdf(html, outPath) {
  const executablePath = findBrowser();
  if (!executablePath) return false;

  let browser;
  try {
    const puppeteer = require("puppeteer-core");
    browser = await puppeteer.launch({
      executablePath,
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--disable-setuid-sandbox",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    });
    const page = await browser.newPage();
    // Fast load without waiting for external network idle
    await page.setContent(html, { waitUntil: "domcontentloaded" });
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      margin: { top: "18mm", right: "16mm", bottom: "18mm", left: "16mm" },
    });
    return true;
  } catch (err) {
    console.warn("PDF render unavailable:", err.message.split("\n")[0]);
    return false;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function formatINR(num) {
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${num}`;
}

function generateReportHTML(company, baseline, simulation) {
  const interventionRows = simulation.selectedInterventions
    .map((i) => `
      <tr>
        <td>${i.name}</td>
        <td>${formatINR(i.capex)}</td>
        <td>${formatINR(i.annualSavings)}/yr</td>
        <td>${i.co2Abated} t</td>
        <td>${i.payback} yrs</td>
      </tr>
    `).join("");

  const projectionRows = simulation.projection
    .map((p) => `
      <tr>
        <td>${p.year}</td>
        <td>${p.emissions.toLocaleString()} t</td>
        <td>${formatINR(p.savings)}</td>
        <td>${formatINR(p.cumulative)}</td>
      </tr>
    `).join("");

  const evidenceRows = baseline.evidenceTrail
    .map((e) => `
      <tr>
        <td>${e.figure}</td>
        <td>${e.value.toFixed(2)} ${e.unit}</td>
        <td>${e.calculation}</td>
      </tr>
    `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Green Ledger Report — ${company.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'DM Sans', 'Segoe UI', sans-serif; color: #0F172A; padding: 40px; max-width: 900px; margin: 0 auto; font-size: 14px; line-height: 1.6; background: #ECEFF1; }
    h1 { font-size: 24px; margin-bottom: 4px; letter-spacing: -0.02em; color: #0F172A; }
    h2 { font-size: 18px; margin: 32px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #0F172A; color: #0F172A; }
    h3 { font-size: 15px; margin: 20px 0 8px; color: #0F172A; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0 24px; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #CBD5E1; }
    th { background: #EDF2F7; font-weight: 600; font-size: 13px; color: #475569; }
    .subtitle { color: #475569; font-size: 14px; margin-bottom: 24px; }
    .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0 24px; }
    .metric-box { background: #F8FAFC; padding: 16px; border-radius: 6px; border: 1px solid #CBD5E1; border-top: 3px solid #0F172A; }
    .metric-box .label { font-size: 12px; color: #64748B; }
    .metric-box .value { font-size: 22px; font-weight: 700; margin-top: 4px; color: #0F172A; }
    .positive { color: #16A34A; }
    .accent { color: #D97706; }
    .disclaimer { margin-top: 40px; padding: 16px; background: #FEF3C7; border-left: 3px solid #D97706; font-size: 13px; color: #475569; border-radius: 4px; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #64748B; }
  </style>
</head>
<body>
  <h1>Green Ledger Report</h1>
  <p class="subtitle">${company.name} · ${company.sector.charAt(0).toUpperCase() + company.sector.slice(1)} · ${company.state}</p>

  <h2>Company Profile</h2>
  <div class="metric-grid">
    <div class="metric-box"><div class="label">Annual Production</div><div class="value">${company.annualProduction.toLocaleString()} ${company.productionUnit}</div></div>
    <div class="metric-box"><div class="label">Export Share</div><div class="value">${company.exportShare}% to ${company.exportDestination || "N/A"}</div></div>
    <div class="metric-box"><div class="label">Power Tariff</div><div class="value">₹${company.powerTariff}/kWh</div></div>
    <div class="metric-box"><div class="label">Employees</div><div class="value">${company.employees || "N/A"}</div></div>
  </div>

  <h2>Carbon Baseline</h2>
  <div class="metric-grid">
    <div class="metric-box"><div class="label">Total Emissions</div><div class="value">${baseline.totalEmissions.toLocaleString()} tCO₂e/yr</div></div>
    <div class="metric-box"><div class="label">Carbon Intensity</div><div class="value">${baseline.carbonIntensity} tCO₂e/t</div></div>
    <div class="metric-box"><div class="label">Sector Median</div><div class="value ${baseline.carbonIntensity < baseline.sectorMedian ? "positive" : ""}">${baseline.sectorMedian} tCO₂e/t</div></div>
    <div class="metric-box"><div class="label">CBAM Exposure</div><div class="value accent">${formatINR(baseline.cbamExposure)}/yr</div></div>
  </div>
  <table>
    <tr><th>Scope</th><th>Emissions (tCO₂e)</th><th>Share</th></tr>
    <tr><td>Scope 1 (Direct)</td><td>${baseline.scope1.toLocaleString()}</td><td>${baseline.totalEmissions > 0 ? Math.round(baseline.scope1 / baseline.totalEmissions * 100) : 0}%</td></tr>
    <tr><td>Scope 2 (Electricity)</td><td>${baseline.scope2.toLocaleString()}</td><td>${baseline.totalEmissions > 0 ? Math.round(baseline.scope2 / baseline.totalEmissions * 100) : 0}%</td></tr>
  </table>

  <h2>Recommended Portfolio</h2>
  <div class="metric-grid">
    <div class="metric-box"><div class="label">Total CAPEX</div><div class="value">${formatINR(simulation.totalCapex)}</div></div>
    <div class="metric-box"><div class="label">CO₂ Abated</div><div class="value positive">${simulation.totalAbatement.toLocaleString()} t/yr</div></div>
    <div class="metric-box"><div class="label">Annual Savings</div><div class="value positive">${formatINR(simulation.totalSavings)}/yr</div></div>
    <div class="metric-box"><div class="label">Blended Payback</div><div class="value accent">${simulation.blendedPayback} yrs</div></div>
  </div>
  <table>
    <tr><th>Intervention</th><th>CAPEX</th><th>Savings</th><th>CO₂ Abated</th><th>Payback</th></tr>
    ${interventionRows}
  </table>

  <h2>5-Year Projection</h2>
  <table>
    <tr><th>Year</th><th>Emissions</th><th>Annual Savings</th><th>Cumulative</th></tr>
    ${projectionRows}
  </table>

  <h2>Evidence Trail</h2>
  <table>
    <tr><th>Figure</th><th>Value</th><th>Calculation</th></tr>
    ${evidenceRows}
  </table>

  <h2>Methodology</h2>
  <table>
    <tr><th>Input</th><th>Source</th></tr>
    <tr><td>Grid emission factors</td><td>CEA CO₂ Baseline Database v19</td></tr>
    <tr><td>Fuel emission factors</td><td>IPCC 2006 Guidelines Vol 2</td></tr>
    <tr><td>Sector benchmarks</td><td>BEE PAT Scheme Data</td></tr>
    <tr><td>Intervention CAPEX</td><td>MNRE benchmarks, vendor quotations</td></tr>
    <tr><td>EU carbon price</td><td>EU ETS (€${baseline.euCarbonPrice}/tCO₂ assumed)</td></tr>
  </table>

  <div class="disclaimer">
    <strong>Disclaimer:</strong> This report provides an evidence trail for carbon accounting purposes. It does not constitute a verification opinion. Every figure is traceable to its source document and published emission factor. Final verification remains with accredited third-party verifiers.
  </div>

  <div class="footer">
    Generated by Green Ledger · ${new Date().toLocaleDateString("en-IN")} · greenledger.in
  </div>
</body>
</html>`;
}

async function generateReport(company, baseline, simulation) {
  const html = generateReportHTML(company, baseline, simulation);

  const reportsDir = path.join(__dirname, "..", "uploads", "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const stem = `report_${company._id}_${Date.now()}`;
  const htmlPath = path.join(reportsDir, `${stem}.html`);
  fs.writeFileSync(htmlPath, html);

  const pdfPath = path.join(reportsDir, `${stem}.pdf`);

  // Create report record immediately with status "ready"
  const report = await Report.create({
    companyId: company._id,
    baselineId: baseline._id,
    simulationId: simulation._id,
    pdfPath: null,
    htmlPath,
    status: "ready",
  });

  // Background PDF rendering so client gets instant (<50ms) preview response
  renderPdf(html, pdfPath)
    .then(async (pdfReady) => {
      if (pdfReady) {
        await Report.findByIdAndUpdate(report._id, { pdfPath });
      }
    })
    .catch((err) => {
      console.warn("Background PDF render error:", err.message);
    });

  return { report, html, pdfReady: false };
}

module.exports = { generateReport, generateReportHTML };
