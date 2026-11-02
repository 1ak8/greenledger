const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const env = require("./config/env");

/**
 * Routes are required inside buildApp so that the model layer has already
 * resolved against whichever database backend is available.
 */
function buildApp() {
  const companyRoutes = require("./routes/company.routes");
  const uploadRoutes = require("./routes/upload.routes");
  const emissionsRoutes = require("./routes/emissions.routes");
  const simulateRoutes = require("./routes/simulate.routes");
  const reportRoutes = require("./routes/report.routes");
  const errorHandler = require("./middleware/errorHandler");

  const app = express();

  app.use(
    cors({
      origin: true,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    })
  );
  app.use(express.json({ limit: "50mb" }));
  app.use("/uploads", express.static(env.UPLOAD_DIR));

  app.use("/api/company", companyRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/emissions", emissionsRoutes);
  app.use("/api/simulate", simulateRoutes);
  app.use("/api/report", reportRoutes);

  app.get("/api/health", (req, res) =>
    res.json({
      status: "ok",
      store: global.__CARBONTWIN_STORE__ === true ? "file" : "mongodb",
    })
  );

  app.use(errorHandler);

  return app;
}

async function start() {
  await connectDB();
  const app = buildApp();
  app.listen(env.PORT, () =>
    console.log(`Server running on port ${env.PORT}`)
  );
}

start();

module.exports = { buildApp };
