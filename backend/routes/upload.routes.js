const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { UPLOAD_DIR, MAX_UPLOAD_MB } = require("../config/env");
const { processUpload } = require("../services/extractor.service");
const Upload = require("../models/Upload.model");

const uploadDir = path.resolve(UPLOAD_DIR);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 },
});

router.post("/", upload.single("file"), async (req, res, next) => {
  try {
    const { companyId, fileType } = req.body;
    if (!companyId || !fileType) return res.status(400).json({ error: "companyId and fileType required" });

    const result = await processUpload(companyId, fileType, req.file.path, req.file.originalname);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:companyId", async (req, res, next) => {
  try {
    const uploads = await Upload.find({ companyId: req.params.companyId }).sort({ createdAt: -1 });
    res.json(uploads);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const doc = await Upload.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Upload not found" });

    if (req.body.extractedData) {
      doc.extractedData = req.body.extractedData;
      doc.status = "reviewed";
    }
    await doc.save();
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
