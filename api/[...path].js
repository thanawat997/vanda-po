import { google } from "googleapis";

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
const SHEET_PRODUCT_TYPES = process.env.GOOGLE_SHEETS_SHEET_PRODUCT_TYPES ?? "product_types";
const SHEET_SIZES = process.env.GOOGLE_SHEETS_SHEET_SIZES ?? "sizes";
const SHEET_PRODUCTS = process.env.GOOGLE_SHEETS_SHEET_PRODUCTS ?? "products";

const readServiceAccountCredentials = () => {
  const jsonBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (jsonBase64) {
    const decoded = Buffer.from(jsonBase64, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (parsed?.private_key && typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  }

  const jsonFromEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonFromEnv) {
    const parsed = JSON.parse(jsonFromEnv);
    if (parsed?.private_key && typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  }

  throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_JSON_BASE64");
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

const sortCaseInsensitive = (values) =>
  values.slice().sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

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

const readJsonBody = async (req) => {
  if (typeof req.body === "object" && req.body !== null) return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
};

const json = (res, status, data) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.statusCode = status;
  res.end(JSON.stringify(data));
};

const ensureSpreadsheetConfigured = () => {
  if (!SPREADSHEET_ID) {
    const err = new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID");
    err.statusCode = 500;
    throw err;
  }
};

const handleDropdownAdd = async (sheetName, req, res) => {
  const body = await readJsonBody(req);
  const value = normalizeString(body?.value);
  if (!value) return json(res, 400, { error: "Missing value" });

  const current = await readStringList(sheetName);
  const next = sortCaseInsensitive(Array.from(new Set([...current, value])));
  await writeStringList(sheetName, next);
  return json(res, 200, { ok: true });
};

const handleDropdownDelete = async (sheetName, req, res) => {
  const body = await readJsonBody(req);
  const value = normalizeString(body?.value);
  if (!value) return json(res, 400, { error: "Missing value" });

  const current = await readStringList(sheetName);
  const next = current.filter((v) => v !== value);
  await writeStringList(sheetName, next);
  return json(res, 200, { ok: true });
};

export default async function handler(req, res) {
  try {
    const pathParam = req.query?.path;
    const parts = Array.isArray(pathParam) ? pathParam : typeof pathParam === "string" ? [pathParam] : [];

    if (parts.length === 0) return json(res, 404, { error: "Not found" });

    if (parts[0] === "health" && req.method === "GET") {
      return json(res, 200, { ok: true });
    }

    if (parts[0] !== "dropdowns") return json(res, 404, { error: "Not found" });
    ensureSpreadsheetConfigured();

    if (parts.length === 1 && req.method === "GET") {
      const [productTypes, sizes, products] = await Promise.all([
        readStringList(SHEET_PRODUCT_TYPES),
        readStringList(SHEET_SIZES),
        readStringList(SHEET_PRODUCTS),
      ]);
      return json(res, 200, { productTypes, sizes, products });
    }

    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    if (parts[1] === "product-types" && parts.length === 2) {
      return await handleDropdownAdd(SHEET_PRODUCT_TYPES, req, res);
    }
    if (parts[1] === "product-types" && parts[2] === "delete") {
      return await handleDropdownDelete(SHEET_PRODUCT_TYPES, req, res);
    }

    if (parts[1] === "sizes" && parts.length === 2) {
      return await handleDropdownAdd(SHEET_SIZES, req, res);
    }
    if (parts[1] === "sizes" && parts[2] === "delete") {
      return await handleDropdownDelete(SHEET_SIZES, req, res);
    }

    if (parts[1] === "products" && parts.length === 2) {
      return await handleDropdownAdd(SHEET_PRODUCTS, req, res);
    }
    if (parts[1] === "products" && parts[2] === "delete") {
      return await handleDropdownDelete(SHEET_PRODUCTS, req, res);
    }

    return json(res, 404, { error: "Not found" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const statusCode =
      err && typeof err === "object" && "statusCode" in err ? Number(err.statusCode) || 500 : 500;
    return json(res, statusCode, { error: message });
  }
}
