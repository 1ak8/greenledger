# CarbonTwin

A decision engine for Indian mid-size manufacturers. Upload utility bills, get a
product-level carbon baseline, then simulate green investments ranked by rupees
saved per tonne of CO₂ abated.

**Stack:** React + Vite · Express · MongoDB · Gemini API

---

## Run locally

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

Runs on `http://localhost:5000`.

If `MONGODB_URI` is unreachable, the server starts an in-memory MongoDB
automatically — enough for a demo, wiped on restart.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:3000`.

---

## Environment

Root `.env` holds backend values. `frontend/.env` holds `VITE_API_URL`.

| Key | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string. Blank/unreachable → in-memory. |
| `GEMINI_API_KEY` | Bill extraction. Blank → seeded demo data. |
| `PORT` | Backend port (default 5000) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `VITE_API_URL` | Backend URL used by the frontend |

Without a Gemini key the extractor returns a seeded dataset for Sharma Steel,
so the full flow still runs end to end.

---

## Flow

1. **Profile** — sector, state, output, export share, tariff
2. **Upload** — electricity bills, fuel invoices, production records
3. **Baseline** — Scope 1 and 2, intensity, benchmark position, CBAM exposure
4. **Simulate** — budget slider, payback ceiling, MACC curve, optimiser
5. **Report** — HTML/PDF with the full evidence trail

---

## API

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/company` | Create company profile |
| GET | `/api/company/:id` | Fetch profile |
| POST | `/api/upload` | Upload and extract a document |
| GET | `/api/upload/:companyId` | List uploads |
| PUT | `/api/upload/:id` | Correct extracted values |
| POST | `/api/emissions/:companyId` | Compute and store baseline |
| GET | `/api/emissions/:companyId` | Fetch baseline |
| POST | `/api/simulate` | Run optimiser (`persist: true` to save) |
| GET | `/api/simulate/:companyId` | List saved simulations |
| PATCH | `/api/simulate/:id/pin` | Pin a plan |
| POST | `/api/report` | Generate report |
| GET | `/api/report/download/:id` | Download report |

---

## Methodology

| Input | Source |
|---|---|
| Grid factors | CEA CO₂ Baseline Database v19 |
| Fuel factors | IPCC 2006 Guidelines, Volume 2 |
| Sector benchmarks | BEE PAT scheme data |
| Intervention capex | MNRE benchmarks, vendor quotations |
| Carbon price | EU ETS, stated as an assumption |

**Scope boundary:** CarbonTwin produces an evidence trail, not a verification
opinion. Every figure links to its source document and emission factor. Final
verification remains with accredited third-party verifiers.
