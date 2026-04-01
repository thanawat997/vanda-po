import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number.parseInt(process.env.PORT ?? "", 10) || 8787;
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SHEET_PRODUCT_TYPES = process.env.GOOGLE_SHEETS_SHEET_PRODUCT_TYPES ?? "product_types";
const SHEET_SIZES = process.env.GOOGLE_SHEETS_SHEET_SIZES ?? "sizes";
const SHEET_PRODUCTS = process.env.GOOGLE_SHEETS_SHEET_PRODUCTS ?? "products";

const readServiceAccountCredentials = () => {
  const jsonFromEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonFromEnv) {
    try {
      return JSON.parse(jsonFromEnv);
    } catch (_err) {
      // Fallback for multiline JSON in .env (not well-supported by dotenv)
      // Try to read from file path instead
    }
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    const raw = fs.readFileSync(credentialsPath, "utf8");
    return JSON.parse(raw);
  }

  const fallbackPath = "/Users/watt/Downloads/my-api-469606-37552932fc1b.json";
  if (fs.existsSync(fallbackPath)) {
    const raw = fs.readFileSync(fallbackPath, "utf8");
    return JSON.parse(raw);
  }

  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS");
};

let cachedSheetsClient;
const getSheetsClient = async () => {
  if (cachedSheetsClient) return cachedSheetsClient;

  const credentials = readServiceAccountCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  cachedSheetsClient = sheets;
  return sheets;
};

const normalizeString = (value) => String(value ?? "").trim();

const readStringList = async (sheetName) => {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });
  const rows = res.data.values ?? [];
  return rows.map((r) => normalizeString(r?.[0])).filter((v) => v.length > 0);
};

const writeStringList = async (sheetName, values) => {
  const sheets = await getSheetsClient();
  const cleaned = values.map((v) => normalizeString(v)).filter((v) => v.length > 0);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });

  if (cleaned.length === 0) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: cleaned.map((v) => [v]) },
  });
};

const sortCaseInsensitive = (values) =>
  values.slice().sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/dropdowns", async (_req, res) => {
  try {
    if (!SPREADSHEET_ID) {
      res.status(500).json({ error: "Missing GOOGLE_SHEETS_SPREADSHEET_ID" });
      return;
    }

    const [productTypes, sizes, products] = await Promise.all([
      readStringList(SHEET_PRODUCT_TYPES),
      readStringList(SHEET_SIZES),
      readStringList(SHEET_PRODUCTS),
    ]);

    res.json({ productTypes, sizes, products });
  } catch (err) {
    console.error("dropdowns error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to load dropdowns" });
  }
});

app.post("/api/dropdowns/product-types", async (req, res) => {
  try {
    const value = normalizeString(req.body?.value);
    if (!SPREADSHEET_ID) {
      res.status(500).json({ error: "Missing GOOGLE_SHEETS_SPREADSHEET_ID" });
      return;
    }
    if (!value) {
      res.status(400).json({ error: "Missing value" });
      return;
    }

    const current = await readStringList(SHEET_PRODUCT_TYPES);
    const next = sortCaseInsensitive(Array.from(new Set([...current, value])));
    await writeStringList(SHEET_PRODUCT_TYPES, next);
    res.json({ ok: true });
  } catch (err) {
    console.error("add product type error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to add product type" });
  }
});

app.post("/api/dropdowns/product-types/delete", async (req, res) => {
  try {
    const value = normalizeString(req.body?.value);
    if (!SPREADSHEET_ID) {
      res.status(500).json({ error: "Missing GOOGLE_SHEETS_SPREADSHEET_ID" });
      return;
    }
    if (!value) {
      res.status(400).json({ error: "Missing value" });
      return;
    }

    const current = await readStringList(SHEET_PRODUCT_TYPES);
    const next = current.filter((v) => v !== value);
    await writeStringList(SHEET_PRODUCT_TYPES, next);
    res.json({ ok: true });
  } catch (err) {
    console.error("delete product type error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to delete product type" });
  }
});

app.post("/api/dropdowns/sizes", async (req, res) => {
  try {
    const value = normalizeString(req.body?.value);
    if (!SPREADSHEET_ID) {
      res.status(500).json({ error: "Missing GOOGLE_SHEETS_SPREADSHEET_ID" });
      return;
    }
    if (!value) {
      res.status(400).json({ error: "Missing value" });
      return;
    }

    const current = await readStringList(SHEET_SIZES);
    const next = sortCaseInsensitive(Array.from(new Set([...current, value])));
    await writeStringList(SHEET_SIZES, next);
    res.json({ ok: true });
  } catch (err) {
    console.error("add size error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to add size" });
  }
});

app.post("/api/dropdowns/sizes/delete", async (req, res) => {
  try {
    const value = normalizeString(req.body?.value);
    if (!SPREADSHEET_ID) {
      res.status(500).json({ error: "Missing GOOGLE_SHEETS_SPREADSHEET_ID" });
      return;
    }
    if (!value) {
      res.status(400).json({ error: "Missing value" });
      return;
    }

    const current = await readStringList(SHEET_SIZES);
    const next = current.filter((v) => v !== value);
    await writeStringList(SHEET_SIZES, next);
    res.json({ ok: true });
  } catch (err) {
    console.error("delete size error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to delete size" });
  }
});

app.post("/api/dropdowns/products", async (req, res) => {
  try {
    const value = normalizeString(req.body?.value);
    if (!SPREADSHEET_ID) {
      res.status(500).json({ error: "Missing GOOGLE_SHEETS_SPREADSHEET_ID" });
      return;
    }
    if (!value) {
      res.status(400).json({ error: "Missing value" });
      return;
    }

    const current = await readStringList(SHEET_PRODUCTS);
    const next = sortCaseInsensitive(Array.from(new Set([...current, value])));
    await writeStringList(SHEET_PRODUCTS, next);
    res.json({ ok: true });
  } catch (err) {
    console.error("add product error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to add product" });
  }
});

app.post("/api/dropdowns/products/delete", async (req, res) => {
  try {
    const value = normalizeString(req.body?.value);
    if (!SPREADSHEET_ID) {
      res.status(500).json({ error: "Missing GOOGLE_SHEETS_SPREADSHEET_ID" });
      return;
    }
    if (!value) {
      res.status(400).json({ error: "Missing value" });
      return;
    }

    const current = await readStringList(SHEET_PRODUCTS);
    const next = current.filter((v) => v !== value);
    await writeStringList(SHEET_PRODUCTS, next);
    res.json({ ok: true });
  } catch (err) {
    console.error("delete product error:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to delete product" });
  }
});

app.use(express.static(path.join(__dirname, "..", "dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

app.listen(PORT, () => {
  process.stdout.write(`API server listening on http://localhost:${PORT}\n`);
});
