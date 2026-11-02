# CarbonTwin API

Base URL: `http://localhost:5000`

All requests and responses are JSON, except document upload (multipart) and
report download (PDF).

---

## Health

### `GET /api/health`

```json
{ "status": "ok", "store": "mongodb" | "file" }
```

`store` reports which backend is active. `file` means a MongoDB server was
unreachable and the local document store took over.

---

## Company

### `POST /api/company`

```json
{
  "name": "Sharma Steel Pvt Ltd",
  "sector": "steel",
  "state": "Chhattisgarh",
  "annualProduction": 18000,
  "productionUnit": "tonnes",
  "employees": 400,
  "revenue": 120,
  "exportShare": 20,
  "exportDestination": "Germany",
  "powerTariff": 8
}
```

Sectors: `steel`, `cement`, `textile`, `chemical`, `auto-component`,
`foundry`, `paper`, `other`.

Returns the created company with `_id`.

### `GET /api/company/:id`

Returns the company, or 404.

---

## Upload

### `POST /api/upload`

`multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `companyId` | string | required |
| `fileType` | string | `electricity`, `fuel`, `production` |
| `file` | file | PDF or image, max 10 MB |

Extracts line items, normalises units to kWh / litre / kg / m3 / tonnes, and
annualises by the document's own distinct billing periods.

Returns:

```json
{
  "_id": "…",
  "companyId": "…",
  "fileType": "electricity",
  "originalName": "bill-mar.pdf",
  "extractedData": [
    {
      "field": "electricity_consumed",
      "value": 785675,
      "unit": "kWh",
      "period": "2026-03",
      "sourceDoc": "bill-mar.pdf",
      "confidence": 0.9,
      "manualOverride": false
    }
  ],
  "status": "extracted"
}
```

Without a Gemini key the extractor returns a seeded dataset for Sharma Steel,
so the flow still completes end to end.

### `GET /api/upload/:companyId`

All uploads for a company, newest first.

### `PUT /api/upload/:id`

```json
{ "extractedData": [ … ] }
```

Replaces the extracted rows and marks the document `reviewed`. Used by the
review table before calculation runs.

---

## Baseline

### `POST /api/emissions/:companyId`

Recomputes and upserts the baseline.

```json
{
  "_id": "…",
  "scope1": 11503,
  "scope2": 8297,
  "scope3": 0,
  "totalEmissions": 19800,
  "carbonIntensity": 1.1,
  "sectorMedian": 1.35,
  "cbamExposure": 26888398,
  "euCarbonPrice": 70,
  "evidenceTrail": [
    {
      "figure": "Electricity 785,675 kWh · 2026-03 × 0.88 tCO₂e/MWh",
      "value": 4148.36,
      "unit": "tCO2e",
      "sourceUploadId": "…",
      "emissionFactorId": "grid.chhattisgarh",
      "calculation": "785,675 kWh ÷ 1000 × 6 (annualisation) × 0.88 = 4148.36 tCO₂e"
    }
  ]
}
```

### `GET /api/emissions/:companyId`

Latest baseline, or 404.

---

## Simulation

### `POST /api/simulate`

```json
{
  "companyId": "…",
  "baselineId": "…",
  "baselineEmissions": 19800,
  "budget": 22000000,
  "paybackCeiling": 5,
  "tariff": 8,
  "tariffEscalation": 5,
  "sector": "steel",
  "toggles": { "solar_500kwp": false },
  "persist": false
}
```

`persist: false` (default) computes without writing — used for live slider
feedback. `persist: true` stores the simulation and returns its `_id`, which
the report endpoint needs.

Response:

```json
{
  "simulation": {
    "_id": "…" ,
    "selectedInterventions": [
      { "id": "vfd_motors", "name": "Motor VFD Retrofits",
        "capex": 1200000, "annualSavings": 900000,
        "co2Abated": 85, "payback": 1.3 }
    ],
    "excludedInterventions": [
      { "id": "solar_500kwp", "name": "Solar 500 kWp",
        "reason": "Exceeds budget" }
    ],
    "totalCapex": 21200000,
    "totalAbatement": 935,
    "totalSavings": 9900000,
    "blendedPayback": 2.14,
    "projection": [
      { "year": 2026, "emissions": 18865, "savings": 9900000, "cumulative": 9900000 }
    ]
  },
  "sensitivity": [
    { "assumption": "Power tariff +20%", "payback": 1.78, "delta": -0.36 }
  ],
  "allInterventions": [ … ]
}
```

The optimiser solves a 0/1 knapsack: maximise abatement subject to budget and
payback ceiling, over at most 2^n combinations (n < 10).

### `GET /api/simulate/interventions/:sector`

The intervention library for a sector.

### `GET /api/simulate/:companyId`

Saved simulations, newest first.

### `PATCH /api/simulate/:id/pin`

```json
{ "label": "Plan A" }
```

Marks the simulation `pinned` and sets a label for side-by-side comparison.

---

## Report

### `POST /api/report`

```json
{
  "companyId": "…",
  "baselineId": "…",
  "simulationId": "…"
}
```

Renders the HTML, attempts a PDF through a locally detected Chrome/Edge, and
stores both. `pdfPath` is `null` when no browser is available; the HTML is
still served on download.

```json
{ "report": { "_id": "…", "status": "ready" }, "html": "<!DOCTYPE html>…" }
```

### `GET /api/report/:companyId`

Report records for a company.

### `GET /api/report/download/:id`

Returns the PDF when available, otherwise the HTML, with
`Content-Disposition: attachment`.

---

## Errors

All errors return:

```json
{ "error": "Human-readable message" }
```

Status codes: `400` validation, `404` not found, `500` unexpected.
