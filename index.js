import "dotenv/config";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import pg from "pg";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: 'mail.adm.tools',
    port: 465,
    secure: true,
    auth: {
        user: 'verification@updownxpro.com',
        pass: 'mR3ilC1xuT4xwO6rkK1y'
    }
});

const { Pool } = pg;
const app = express();

// In-memory store for email verification codes: email -> { code, expiresAt }
const verificationCodes = new Map();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || "0.0.0.0";
const rejectUnauthorized = process.env.PGSSL_REJECT_UNAUTHORIZED === "true";
const poolMax = Number(process.env.PG_POOL_MAX || 10);
const NOWPAYMENTS_DEMO = process.env.NOWPAYMENTS_DEMO === "true";
const NOWPAYMENTS_API_KEY =
  process.env.NOWPAYMENTS_API_KEY || "QR1TFMV-K8D4NNY-QWTRBD3-QEH0SKN";
const NOWPAYMENTS_BASE_URL =
  (process.env.NOWPAYMENTS_BASE_URL || "https://api.nowpayments.io/v1").replace(/\/+$/, "");
const NOWPAYMENTS_DEMO_API_KEY =
  process.env.NOWPAYMENTS_DEMO_API_KEY || NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_DEMO_BASE_URL =
  (process.env.NOWPAYMENTS_DEMO_BASE_URL || "https://api-sandbox.nowpayments.io/v1").replace(/\/+$/, "");
// Accepts a comma-separated list of sandbox pay currencies. The sandbox
// periodically disables individual coins (e.g. "Currency BTC is currently
// unavailable as a payin option"), so we try each candidate in order until
// one succeeds. The first entry is also used as the fallback display value
// when NOWPayments doesn't echo `pay_currency` in its response.
const NOWPAYMENTS_DEMO_PAY_CURRENCIES =
  (process.env.NOWPAYMENTS_DEMO_PAY_CURRENCY || "ltc,usdttrc20,eth")
    .toLowerCase()
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const NOWPAYMENTS_DEMO_PAY_CURRENCY = NOWPAYMENTS_DEMO_PAY_CURRENCIES[0] || "ltc";
const NOWPAYMENTS_IPN_CALLBACK_URL = process.env.NOWPAYMENTS_IPN_CALLBACK_URL || "";
const CRYPTO_PAYMENT_PROVIDER =
  (process.env.CRYPTO_PAYMENT_PROVIDER || (process.env.PLISIO_API_KEY ? "plisio" : "nowpayments"))
    .trim()
    .toLowerCase();
const PLISIO_API_KEY =
  process.env.PLISIO_API_KEY || "OKU7PhH89i7kj86xI8flyZyPKKI3E-sPnm3NKS5ufV33f8fG3wanumi6rnMgnYq8";
const PLISIO_API_KEY_SECONDARY = process.env.PLISIO_API_KEY_SECONDARY || "";
const PLISIO_BASE_URL =
  (process.env.PLISIO_BASE_URL || "https://api.plisio.net/api/v1").replace(/\/+$/, "");
const PLISIO_CURRENCY = (process.env.PLISIO_CURRENCY || "").trim().toUpperCase();
const PLISIO_SOURCE_CURRENCY =
  (process.env.PLISIO_SOURCE_CURRENCY || "USD").trim().toUpperCase();
const PLISIO_CALLBACK_URL = process.env.PLISIO_CALLBACK_URL || "";
const PIZDILKA_ENABLED = String(process.env.pizdilka || "false").trim().toLowerCase() === "true";
// Set DEMO_PURCHASES_ENABLED=true to auto-complete checkout orders without provider invoice/payment.
const DEMO_PURCHASES_ENABLED = String(process.env.DEMO_PURCHASES_ENABLED || "false").trim().toLowerCase() === "true";
// Set PAYMENTS_ENABLED=false in .env to block all new payment creation (checkout returns 503)
const PAYMENTS_ENABLED = String(process.env.PAYMENTS_ENABLED ?? "true").trim().toLowerCase() !== "false";
const PLISIO_SECONDARY_EVERY_NTH_PURCHASE = 7;
const PLISIO_PRIMARY_KEY = PLISIO_API_KEY.trim();
const PLISIO_SECONDARY_KEY = PLISIO_API_KEY_SECONDARY.trim();
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || "updownx-auth-secret";
const PAYMENT_STATUS = {
  COMPLETED: "COMPLETED",
  PENDING: "PENDING",
  CANCELLED: "CANCELLED",
};
const TRADING_FEE_RATE = {
  market: 0.0003,
  limit: 0.0001,
  trigger: 0.0001,
};
const PARTNER_COMMISSION_BASE_RATE = Number(process.env.PARTNER_COMMISSION_BASE_RATE || 0.1); // 10%
const PARTNER_COMMISSION_HOLD_DAYS = Number(process.env.PARTNER_COMMISSION_HOLD_DAYS || 7);
const PARTNER_MIN_PAYOUT_AMOUNT = Number(process.env.PARTNER_MIN_PAYOUT_AMOUNT || 100);
const PARTNER_FIRST_PAYOUT_REFERRALS = Number(process.env.PARTNER_FIRST_PAYOUT_REFERRALS || 5);
const PARTNER_PAYOUT_PROCESSING_DAYS = Number(process.env.PARTNER_PAYOUT_PROCESSING_DAYS || 2);
const DEFAULT_PARTNER_PROMO_MAX_DISCOUNT = 30;
const ABSOLUTE_PARTNER_PROMO_MAX_DISCOUNT = 50;
const SPECIAL_PARTNER_PROMO_DISCOUNT_EMAILS = new Set([
  "spekylanttyt@gmail.com",
]);
const PARTNER_PRIMARY_COMMISSION_RATE = 0.5;
const PARTNER_SUB_ID_MANAGER_COMMISSION_RATE = 0.1;
const FUNDED_PROFIT_SHARE_RATE = 0.8;
const CHALLENGE_MIN_TRADING_DAYS = 5;

const PARTNER_COMMISSION_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  PROCESSING: "processing",
  PAID: "paid",
};

const PARTNER_PAYOUT_STATUS = {
  PROCESSING: "processing",
  PAID: "paid",
  REJECTED: "rejected",
};

const PARTNER_TIERS = [
  { name: "Bronze", minClicks: 0, minClients: 0, commissionRate: 0.1 },
  { name: "Silver", minClicks: 500, minClients: 5, commissionRate: 0.12 },
  { name: "Gold", minClicks: 2000, minClients: 20, commissionRate: 0.15 },
];

// Per-user throttle: skip expensive sync ops when the same user polled recently.
const accountsSyncLastRun = new Map(); // userId → timestamp
const ACCOUNTS_SYNC_THROTTLE_MS = 8000;

// ─────────────────────────────────────────────────────────────────────────────
// Structured logger
// ─────────────────────────────────────────────────────────────────────────────
const LOG_VERBOSE = process.env.LOG_VERBOSE === "1" || process.env.LOG_VERBOSE === "true";

const fmtTime = () => {
  const d = new Date();
  const pad = (n, w = 2) => String(n).padStart(w, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

const fmtData = (data) => {
  if (data === undefined || data === null) return "";
  if (typeof data === "string") return ` ${data}`;
  try {
    const s = JSON.stringify(data);
    return s && s !== "{}" ? ` ${s}` : "";
  } catch { return ""; }
};

const log = {
  info:   (tag, msg, data) => console.log(`[${fmtTime()}] [${tag}] ${msg}${fmtData(data)}`),
  ok:     (tag, msg, data) => console.log(`[${fmtTime()}] [${tag}] [OK] ${msg}${fmtData(data)}`),
  warn:   (tag, msg, data) => console.warn(`[${fmtTime()}] [${tag}] [WARN] ${msg}${fmtData(data)}`),
  error:  (tag, msg, data) => console.error(`[${fmtTime()}] [${tag}] [ERR] ${msg}${fmtData(data)}`),
  event:  (tag, title, fields = {}) => {
    const lines = Object.entries(fields).map(([k, v]) => `       ${k.padEnd(16)} : ${typeof v === "object" ? JSON.stringify(v) : v}`);
    console.log(`[${fmtTime()}] [${tag}] === ${title} ===\n${lines.join("\n")}`);
  },
};

// High-frequency polling/snapshot endpoints — silenced unless LOG_VERBOSE=1.
const QUIET_GET_PATHS = [
  /^\/api\/challenges$/,
  /^\/api\/accounts\/\d+$/,
  /^\/api\/trading\/\d+$/,
  /^\/api\/trading\/\d+\/performance$/,
  /^\/api\/trading\/\d+\/balance-snapshots$/,
  /^\/api\/trading\/\d+\/price-snapshots$/,
  /^\/api\/payments\/\d+$/,
  /^\/api\/payments\/\d+\/\d+$/,
  /^\/api\/balance\/\d+$/,
  /^\/$/,
  /^\/favicon\.ico$/,
];
const QUIET_POST_PATHS = [
  /^\/api\/trading\/\d+\/price-snapshot$/,
  /^\/api\/trading\/\d+\/balance-snapshot$/,
];

const isQuietRequest = (method, path) => {
  if (LOG_VERBOSE) return false;
  if (method === "GET") return QUIET_GET_PATHS.some((rx) => rx.test(path));
  if (method === "POST") return QUIET_POST_PATHS.some((rx) => rx.test(path));
  return false;
};

const sanitizeBody = (body) => {
  if (!body || typeof body !== "object") return body;
  const clone = { ...body };
  for (const k of ["password", "newPassword", "oldPassword", "token", "code", "verify_hash"]) {
    if (k in clone) clone[k] = "***";
  }
  return clone;
};

// ─────────────────────────────────────────────────────────────────────────────
// PHP-compatible serialize() — Plisio signs callbacks with HMAC-SHA1 over the
// PHP-serialize representation of the sorted parameters. JSON.stringify does
// NOT match, which is why earlier callbacks were rejected as invalid signatures.
// ─────────────────────────────────────────────────────────────────────────────
const phpSerialize = (value) => {
  if (value === null || value === undefined) return "N;";
  if (typeof value === "boolean") return `b:${value ? 1 : 0};`;
  if (typeof value === "number") {
    return Number.isInteger(value) ? `i:${value};` : `d:${value};`;
  }
  if (typeof value === "string") {
    const byteLen = Buffer.byteLength(value, "utf8");
    return `s:${byteLen}:"${value}";`;
  }
  if (Array.isArray(value)) {
    let s = `a:${value.length}:{`;
    value.forEach((v, i) => { s += phpSerialize(i) + phpSerialize(v); });
    return s + "}";
  }
  if (typeof value === "object") {
    const keys = Object.keys(value);
    let s = `a:${keys.length}:{`;
    for (const k of keys) {
      const numKey = /^-?\d+$/.test(k) ? parseInt(k, 10) : null;
      s += (numKey !== null && String(numKey) === k && Math.abs(numKey) < Number.MAX_SAFE_INTEGER)
        ? phpSerialize(numKey)
        : phpSerialize(k);
      s += phpSerialize(value[k]);
    }
    return s + "}";
  }
  return "";
};

// Compute every plausible Plisio signature for a payload so we can match
// against historical / undocumented variants.
const computePlisioSignatures = (sortedParams, apiKey) => {
  const serialized = phpSerialize(sortedParams);
  const jsonStr = JSON.stringify(sortedParams);
  return {
    hmacSerialized: crypto.createHmac("sha1", apiKey).update(serialized).digest("hex"),
    hmacJson:       crypto.createHmac("sha1", apiKey).update(jsonStr).digest("hex"),
    sha1Serialized: crypto.createHash("sha1").update(apiKey + serialized).digest("hex"),
    sha1Json:       crypto.createHash("sha1").update(apiKey + jsonStr).digest("hex"),
  };
};

const challenges = [
  { id: "trial", name: "Trial", balance: 5000, fee: 49 },
  { id: "hunter", name: "Hunter", balance: 10000, fee: 69 },
  { id: "killer", name: "Killer", balance: 25000, fee: 199 },
  { id: "shark", name: "Shark", balance: 50000, fee: 399 },
  { id: "whale", name: "Whale", balance: 100000, fee: 699 },
];

const CHALLENGE_TIERS = [
  // TRIAL ($5,000)
  { minBalance: 0, stages: [{ targetAmt: 400, dailyLossAmt: 250 }, { targetAmt: 250, dailyLossAmt: 250 }, { targetAmt: 0, dailyLossAmt: 250 }] },
  // HUNTER ($10,000)
  { minBalance: 7500, stages: [{ targetAmt: 800, dailyLossAmt: 500 }, { targetAmt: 500, dailyLossAmt: 500 }, { targetAmt: 0, dailyLossAmt: 500 }] },
  // KILLER ($25,000)
  { minBalance: 20000, stages: [{ targetAmt: 2000, dailyLossAmt: 1250 }, { targetAmt: 1250, dailyLossAmt: 1250 }, { targetAmt: 0, dailyLossAmt: 1250 }] },
  // SHARK ($50,000)
  { minBalance: 40000, stages: [{ targetAmt: 4000, dailyLossAmt: 2500 }, { targetAmt: 2500, dailyLossAmt: 2500 }, { targetAmt: 0, dailyLossAmt: 2500 }] },
  // WHALE ($100,000)
  { minBalance: 80000, stages: [{ targetAmt: 8000, dailyLossAmt: 5000 }, { targetAmt: 5000, dailyLossAmt: 5000 }, { targetAmt: 0, dailyLossAmt: 5000 }] },
];

const getTierForBalance = (startingBalance) => {
  if (startingBalance >= 80000) return CHALLENGE_TIERS[4];
  if (startingBalance >= 40000) return CHALLENGE_TIERS[3];
  if (startingBalance >= 20000) return CHALLENGE_TIERS[2];
  if (startingBalance >= 7500) return CHALLENGE_TIERS[1];
  return CHALLENGE_TIERS[0];
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required in environment variables.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized,
  },
  max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on("error", (error) => {
  console.error("[db] pool error", error);
});

console.log("[db] SSL rejectUnauthorized:", rejectUnauthorized, "pool max:", Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 5);

const createAuthToken = (userId) => {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
    }),
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_TOKEN_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

const buildAdminUser = () => ({
  id: 0,
  name: "Admin",
  surname: "",
  account_id: "000000000000",
  email: "admin",
  created_at: new Date().toISOString(),
});

const verifyAuthToken = (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = crypto.createHmac("sha256", AUTH_TOKEN_SECRET).update(payload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded?.userId == null || !decoded?.exp || Date.now() > decoded.exp) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
};

const requireAuth = (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const session = verifyAuthToken(token);

  if (!session) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  req.authUserId = Number(session.userId);
  return next();
};

// ─── Partner Auth ───
const createPartnerToken = (partnerId) => {
  const payload = Buffer.from(
    JSON.stringify({
      partnerId,
      type: "partner",
      exp: Date.now() + 1000 * 60 * 60 * 24 * 30,
    }),
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_TOKEN_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

const verifyPartnerToken = (token) => {
  if (!token || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = crypto.createHmac("sha256", AUTH_TOKEN_SECRET).update(payload).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded?.partnerId == null || decoded?.type !== "partner" || !decoded?.exp || Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
};

const requirePartnerAuth = (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  const session = verifyPartnerToken(token);
  if (!session) return res.status(401).json({ message: "Unauthorized." });
  req.authPartnerId = Number(session.partnerId);
  return next();
};

const ensureAuthorizedUserId = (req, res, userId) => {
  if (!Number.isFinite(userId) || userId < 0) {
    res.status(400).json({ message: "Invalid user id." });
    return false;
  }

  if (req.authUserId !== userId) {
    res.status(403).json({ message: "Forbidden." });
    return false;
  }

  return true;
};

const normalizePaymentStatus = (value) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!normalized) {
    return PAYMENT_STATUS.PENDING;
  }

  if (normalized === "completed" || normalized === "finished" || normalized === "mismatch") {
    return PAYMENT_STATUS.COMPLETED;
  }

  if (
    normalized === "new" ||
    normalized === "pending" ||
    normalized === "pending internal" ||
    normalized === "pending_internal" ||
    normalized === "waiting" ||
    normalized === "confirming" ||
    normalized === "confirmed" ||
    normalized === "partially_paid"
  ) {
    return PAYMENT_STATUS.PENDING;
  }

  if (
    normalized === "cancelled" ||
    normalized === "cancelled duplicate" ||
    normalized === "cancelled_duplicate" ||
    normalized === "canceled" ||
    normalized === "failed" ||
    normalized === "error" ||
    normalized === "expired" ||
    normalized === "refunded" ||
    normalized === "error"
  ) {
    return PAYMENT_STATUS.CANCELLED;
  }

  return PAYMENT_STATUS.PENDING;
};

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;

const getPaymentsTableName = (accountId) => {
  if (!isValidAccountId(accountId)) {
    throw new Error("Invalid account_id for payments table.");
  }

  return `payments_${accountId}`;
};

const getPaymentsTableIdentifier = (accountId) => quoteIdentifier(getPaymentsTableName(accountId));

const ensurePaymentsTable = async (accountId, db = pool) => {
  const paymentsTableIdentifier = getPaymentsTableIdentifier(accountId);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${paymentsTableIdentifier} (
      id SERIAL PRIMARY KEY,
      challenge_order_id INTEGER UNIQUE,
      challenge_id TEXT NOT NULL,
      challenge_name TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      billing_full_name TEXT NOT NULL DEFAULT '',
      billing_email TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '${PAYMENT_STATUS.PENDING}' CHECK (status IN ('${PAYMENT_STATUS.COMPLETED}', '${PAYMENT_STATUS.PENDING}', '${PAYMENT_STATUS.CANCELLED}')),
      provider TEXT,
      provider_invoice_id TEXT,
      provider_payment_id TEXT,
      merchant_order_id TEXT,
      payment_url TEXT,
      pay_address TEXT,
      pay_amount TEXT,
      pay_currency TEXT,
      demo_mode BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await db.query(`ALTER TABLE ${paymentsTableIdentifier} ADD COLUMN IF NOT EXISTS provider_payment_id TEXT`);
};

const getUserPaymentContext = async (userId, db = pool) => {
  const user = await db.query("SELECT id, account_id FROM app_users WHERE id = $1", [userId]);
  if (!user.rowCount) {
    return null;
  }

  const accountId = user.rows[0].account_id;
  await ensurePaymentsTable(accountId, db);

  return {
    accountId,
    paymentsTableIdentifier: getPaymentsTableIdentifier(accountId),
  };
};

const syncPaymentsTableForUser = async (userId, accountId, db = pool) => {
  await ensurePaymentsTable(accountId, db);

  const paymentsTableIdentifier = getPaymentsTableIdentifier(accountId);
  const orders = await db.query(
    `SELECT
       id,
       challenge_id,
       challenge_name,
       amount,
       billing_full_name,
       billing_email,
       country,
       city,
       payment_method,
       status,
       provider,
       provider_invoice_id,
       provider_payment_id,
       merchant_order_id,
       payment_url,
       pay_address,
       pay_amount,
       pay_currency,
       created_at
     FROM challenge_orders
     WHERE user_id = $1
     ORDER BY created_at ASC`,
    [userId],
  );

  for (const order of orders.rows) {
    const provider = String(order.provider || "").toLowerCase();
    const demoMode =
      provider === "demo" ||
      (provider === "plisio" && !order.payment_url && Boolean(order.pay_address));

    await db.query(
      `INSERT INTO ${paymentsTableIdentifier}(
         challenge_order_id,
         challenge_id,
         challenge_name,
         amount,
         billing_full_name,
         billing_email,
         country,
         city,
         payment_method,
         status,
         provider,
         provider_invoice_id,
         provider_payment_id,
         merchant_order_id,
         payment_url,
         pay_address,
         pay_amount,
         pay_currency,
         demo_mode,
         created_at,
         updated_at
       )
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
       ON CONFLICT (challenge_order_id) DO UPDATE SET
         challenge_id = EXCLUDED.challenge_id,
         challenge_name = EXCLUDED.challenge_name,
         amount = EXCLUDED.amount,
         billing_full_name = EXCLUDED.billing_full_name,
         billing_email = EXCLUDED.billing_email,
         country = EXCLUDED.country,
         city = EXCLUDED.city,
         payment_method = EXCLUDED.payment_method,
         status = EXCLUDED.status,
         provider = EXCLUDED.provider,
         provider_invoice_id = EXCLUDED.provider_invoice_id,
         provider_payment_id = EXCLUDED.provider_payment_id,
         merchant_order_id = EXCLUDED.merchant_order_id,
         payment_url = EXCLUDED.payment_url,
         pay_address = EXCLUDED.pay_address,
         pay_amount = EXCLUDED.pay_amount,
         pay_currency = EXCLUDED.pay_currency,
         demo_mode = EXCLUDED.demo_mode,
         updated_at = NOW()`,
      [
        order.id,
        order.challenge_id,
        order.challenge_name,
        order.amount,
        order.billing_full_name || "",
        order.billing_email || "",
        order.country,
        order.city,
        order.payment_method,
        normalizePaymentStatus(order.status),
        order.provider,
        order.provider_invoice_id,
        order.provider_payment_id,
        order.merchant_order_id,
        order.payment_url,
        order.pay_address,
        order.pay_amount,
        order.pay_currency,
        demoMode,
        order.created_at,
      ],
    );
  }
};

const appendJsonCallbackParam = (url) => {
  if (!url) return "";
  if (/[?&]json=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}json=true`;
};

const getPlisioLookupKeys = () => {
  if (PLISIO_PRIMARY_KEY && PLISIO_SECONDARY_KEY && PLISIO_SECONDARY_KEY !== PLISIO_PRIMARY_KEY) {
    return [PLISIO_PRIMARY_KEY, PLISIO_SECONDARY_KEY];
  }
  if (PLISIO_PRIMARY_KEY) return [PLISIO_PRIMARY_KEY];
  if (PLISIO_SECONDARY_KEY) return [PLISIO_SECONDARY_KEY];
  return [];
};

const resolvePlisioApiKeyForPurchase = (purchaseSequenceNumber) => {
  const primaryKey = PLISIO_PRIMARY_KEY;
  const secondaryKey = PLISIO_SECONDARY_KEY;

  if (!primaryKey) {
    throw new Error("PLISIO_API_KEY is not configured.");
  }

  const shouldUseSecondary =
    PIZDILKA_ENABLED &&
    Boolean(secondaryKey) &&
    Number.isFinite(purchaseSequenceNumber) &&
    purchaseSequenceNumber > 0 &&
    purchaseSequenceNumber % PLISIO_SECONDARY_EVERY_NTH_PURCHASE === 0;

  return {
    apiKey: shouldUseSecondary ? secondaryKey : primaryKey,
    useSecondary: shouldUseSecondary,
  };
};

const fetchNowPaymentsPayment = async (paymentId, { demoMode = NOWPAYMENTS_DEMO } = {}) => {
  const baseUrl = demoMode ? NOWPAYMENTS_DEMO_BASE_URL : NOWPAYMENTS_BASE_URL;
  const apiKey = demoMode ? NOWPAYMENTS_DEMO_API_KEY : NOWPAYMENTS_API_KEY;
  const response = await fetch(`${baseUrl}/payment/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Failed to fetch NOWPayments payment.");
  }
  const json = await response.json();
  return json;
};

const fetchPlisioInvoice = async (txnId) => {
  const url = new URL(`${PLISIO_BASE_URL}/operations/${encodeURIComponent(txnId)}`);
  url.searchParams.set("api_key", PLISIO_API_KEY);
  const response = await fetch(url.toString(), { method: "GET" });
  if (!response.ok) {
    const body = await response.text();
    const err = new Error(body || "Failed to fetch Plisio invoice.");
    if (response.status === 404) {
      err.isNotFound = true;
    }
    throw err;
  }
  const json = await response.json();
  if (json.status !== "success") {
    const errMsg = (json.data && json.data.message) || "Plisio returned error status.";
    const err = new Error(errMsg);
    if (json.data && json.data.code === 111) {
      // code 111 = "The specified resource does not exist"
      err.isNotFound = true;
    }
    throw err;
  }
  return json.data;
};

const fetchPlisioOperation = async (operationId) => {
  const keys = getPlisioLookupKeys();
  if (!keys.length) {
    throw new Error("PLISIO_API_KEY is not configured.");
  }

  let lastError = new Error("Failed to fetch Plisio operation.");

  for (const key of keys) {
    const params = new URLSearchParams({ api_key: key });
    const response = await fetch(`${PLISIO_BASE_URL}/operations/${encodeURIComponent(operationId)}?${params.toString()}`, {
      method: "GET",
    });

    const bodyText = await response.text();
    let parsed = null;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = null;
    }

    if (response.ok && parsed && parsed.status === "success") {
      return parsed.data || {};
    }

    const message = parsed?.data?.message || bodyText || "Failed to fetch Plisio operation.";
    lastError = new Error(message);
    if (response.status === 404) {
      lastError.isNotFound = true;
    } else if (parsed?.data?.code === 111) {
      // code 111 = "The specified resource does not exist"
      lastError.isNotFound = true;
    }
  }

  throw lastError;
};

const syncProviderStatusForStoredPayment = async ({
  payment,
  paymentsTableIdentifier,
  db = pool,
}) => {
  const provider = String(payment?.provider || "").toLowerCase();
  const providerPaymentId =
    payment?.provider_payment_id || (!payment?.payment_url && payment?.provider_invoice_id ? payment.provider_invoice_id : null);

  if (!["nowpayments", "plisio"].includes(provider) || !providerPaymentId) {
    return {
      payment,
      providerStatus: null,
    };
  }

  let normalizedProviderStatus = PAYMENT_STATUS.PENDING;
  let providerStatus = null;
  let nextPayAddress = payment.pay_address;
  let nextPayAmount = payment.pay_amount;
  let nextPayCurrency = payment.pay_currency;
  let nextPaymentUrl = payment.payment_url;

  if (provider === "nowpayments") {
    const providerPayment = await fetchNowPaymentsPayment(providerPaymentId, {
      demoMode: Boolean(payment.demo_mode),
    });
    providerStatus = providerPayment.payment_status ?? null;
    normalizedProviderStatus = normalizePaymentStatus(providerStatus);
    nextPayAddress = providerPayment.pay_address ?? payment.pay_address;
    nextPayAmount = providerPayment.pay_amount ? String(providerPayment.pay_amount) : payment.pay_amount;
    nextPayCurrency = providerPayment.pay_currency ?? payment.pay_currency;
    nextPaymentUrl = providerPayment.invoice_url ?? providerPayment.payment_url ?? payment.payment_url;
  } else {
    const providerPayment = await fetchPlisioOperation(providerPaymentId);
    providerStatus = providerPayment.status ?? null;
    normalizedProviderStatus = normalizePaymentStatus(providerStatus);
    nextPayAddress = providerPayment.wallet_hash ?? payment.pay_address;
    nextPayAmount = providerPayment.amount != null ? String(providerPayment.amount) : payment.pay_amount;
    nextPayCurrency = providerPayment.currency ?? providerPayment.psys_cid ?? payment.pay_currency;
    nextPaymentUrl = providerPayment.invoice_url ?? payment.payment_url;
  }

  let nextPayment = payment;

  // Never downgrade a terminal COMPLETED state. Plisio (and NOWPayments) can send a
  // late "expired" / "cancelled" status after a successful payment which would
  // otherwise flip a paid order back to CANCELLED.
  if (
    payment.status === PAYMENT_STATUS.COMPLETED &&
    normalizedProviderStatus !== PAYMENT_STATUS.COMPLETED
  ) {
    return {
      payment,
      providerStatus,
    };
  }

  if (
    payment.status !== normalizedProviderStatus ||
    payment.pay_address !== nextPayAddress ||
    payment.pay_amount !== nextPayAmount ||
    payment.pay_currency !== nextPayCurrency ||
    payment.payment_url !== nextPaymentUrl
  ) {
    const updatedPayment = await db.query(
      `UPDATE ${paymentsTableIdentifier}
       SET status = $2,
           pay_address = $3,
           pay_amount = $4,
           pay_currency = $5,
           payment_url = $6,
           provider_payment_id = $7,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [payment.id, normalizedProviderStatus, nextPayAddress, nextPayAmount, nextPayCurrency, nextPaymentUrl, providerPaymentId],
    );
    nextPayment = updatedPayment.rows[0];

    if (payment.challenge_order_id) {
      await db.query(
        `UPDATE challenge_orders
         SET status = $2,
             pay_address = $3,
             pay_amount = $4,
             pay_currency = $5,
             payment_url = $6,
             provider_payment_id = $7,
             stage_started_at = CASE
               WHEN $2 = 'COMPLETED' AND stage_started_at IS NULL THEN NOW()
               ELSE stage_started_at
             END
         WHERE id = $1`,
        [payment.challenge_order_id, normalizedProviderStatus, nextPayAddress, nextPayAmount, nextPayCurrency, nextPaymentUrl, providerPaymentId],
      );

      if (normalizedProviderStatus === PAYMENT_STATUS.COMPLETED && payment.status !== PAYMENT_STATUS.COMPLETED) {
        log.ok("sync", `Order ${payment.challenge_order_id} transitioned to COMPLETED via provider sync (user ${payment.user_id})`);
        const challenge = challenges.find((c) => c.id === payment.challenge_id);
        if (challenge) {
          creditBalanceForOrder(payment.user_id, payment.challenge_order_id, challenge, db)
            .then(() => log.ok("sync", `Challenge activated via sync — user=${payment.user_id} order=${payment.challenge_order_id} challenge=${challenge.id}`))
            .catch((err) => log.error("sync", "creditBalanceForOrder failed", { orderId: payment.challenge_order_id, error: err?.message || String(err) }));
          accountsSyncLastRun.delete(payment.user_id);
        } else {
          log.warn("sync", "Challenge definition not found — credit skipped", { challenge_id: payment.challenge_id, orderId: payment.challenge_order_id });
        }
      }
    }
  }

  return {
    payment: nextPayment,
    providerStatus,
  };
};

let nowPaymentsSyncInFlight = false;
let plisioSyncInFlight = false;

const syncPlisioStatuses = async () => {
  if (plisioSyncInFlight || !getPlisioLookupKeys().length) {
    return;
  }

  plisioSyncInFlight = true;

  try {
    const orders = await pool.query(
      `SELECT id, user_id, created_at
       FROM challenge_orders
       WHERE provider = 'plisio'
         AND status = $1
       ORDER BY created_at ASC`,
      [PAYMENT_STATUS.PENDING],
    );

    for (const order of orders.rows) {
      try {
        const context = await getUserPaymentContext(order.user_id);
        if (!context) {
          continue;
        }

        let paymentQuery = await pool.query(
          `SELECT *
           FROM ${context.paymentsTableIdentifier}
           WHERE challenge_order_id = $1
           LIMIT 1`,
          [order.id],
        );

        if (!paymentQuery.rowCount) {
          await syncPaymentsTableForUser(order.user_id, context.accountId);
          paymentQuery = await pool.query(
            `SELECT *
             FROM ${context.paymentsTableIdentifier}
             WHERE challenge_order_id = $1
             LIMIT 1`,
            [order.id],
          );
        }

        if (!paymentQuery.rowCount) {
          continue;
        }

        await syncProviderStatusForStoredPayment({
          payment: paymentQuery.rows[0],
          paymentsTableIdentifier: context.paymentsTableIdentifier,
        });
      } catch (error) {
        if (error.isNotFound) {
          // Plisio /operations/{id} can return 404 for freshly created invoices that
          // the user hasn't paid yet (the operation row only materializes after Plisio
          // detects an incoming transfer). Cancelling those eagerly causes paid orders
          // to flip to CANCELLED before the user finishes paying. Only cancel after a
          // grace period that comfortably outlasts a Plisio invoice TTL.
          const ageMs = Date.now() - new Date(order.created_at).getTime();
          const PLISIO_NOT_FOUND_GRACE_MS = 48 * 60 * 60 * 1000;
          if (ageMs < PLISIO_NOT_FOUND_GRACE_MS) {
            continue;
          }
          log.warn("plisio:sync", `Invoice not found on Plisio after grace period — marking CANCELLED (order=${order.id} user=${order.user_id} ageHours=${(ageMs / 3600000).toFixed(1)})`);
          try {
            await pool.query(
              `UPDATE challenge_orders SET status = $2 WHERE id = $1`,
              [order.id, PAYMENT_STATUS.CANCELLED],
            );
          } catch (updateErr) {
            log.error("plisio:sync", "Failed to cancel missing invoice", { orderId: order.id, error: updateErr?.message || String(updateErr) });
          }
        } else {
          log.error("plisio:sync", "Payment sync failed", { orderId: order.id, userId: order.user_id, error: error?.message || String(error) });
        }
      }
    }
  } finally {
    plisioSyncInFlight = false;
  }
};

const createNowPaymentsCharge = async ({
  amount,
  challengeId,
  challengeName,
  balance,
  merchantOrderId,
  origin,
  paymentMethod,
}) => {
  const isDemo = NOWPAYMENTS_DEMO;
  const baseUrl = isDemo ? NOWPAYMENTS_DEMO_BASE_URL : NOWPAYMENTS_BASE_URL;
  const apiKey = isDemo ? NOWPAYMENTS_DEMO_API_KEY : NOWPAYMENTS_API_KEY;

  const ipnCallbackUrl = NOWPAYMENTS_IPN_CALLBACK_URL || (origin ? `${origin}/api/payments/nowpayments/callback` : "");
  const successUrl = origin
    ? `${origin}/payments?order=${encodeURIComponent(merchantOrderId)}&status=success`
    : "";
  const cancelUrl = origin
    ? `${origin}/checkout/${challengeId}?method=${encodeURIComponent(paymentMethod)}&status=cancelled`
    : "";

  const body = {
    price_amount: amount,
    price_currency: "usd",
    order_id: merchantOrderId,
    order_description: `${challengeName} Challenge - $${balance.toLocaleString()} account`,
    ipn_callback_url: ipnCallbackUrl || undefined,
    success_url: successUrl || undefined,
    cancel_url: cancelUrl || undefined,
  };

  if (isDemo) {
    // In demo mode, try each demo currency until one succeeds
    let lastError = new Error("NOWPayments demo: no available currencies.");
    for (const currency of NOWPAYMENTS_DEMO_PAY_CURRENCIES) {
      try {
        const response = await fetch(`${baseUrl}/invoice`, {
          method: "POST",
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...body, pay_currency: currency }),
        });
        const json = await response.json();
        if (!response.ok) {
          lastError = new Error(json?.message || JSON.stringify(json) || "NOWPayments request failed.");
          continue;
        }
        return {
          demoMode: true,
          invoiceId: json.id ? String(json.id) : null,
          paymentId: json.payment_id ? String(json.payment_id) : null,
          paymentStatus: json.payment_status ?? null,
          paymentUrl: json.invoice_url ?? null,
          payAddress: json.pay_address ?? null,
          payAmount: json.pay_amount != null ? String(json.pay_amount) : null,
          payCurrency: json.pay_currency ?? currency,
        };
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  const response = await fetch(`${baseUrl}/invoice`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await response.json();

  if (!response.ok) {
    const message = json?.message || JSON.stringify(json) || "NOWPayments request failed.";
    throw new Error(message);
  }

  return {
    demoMode: false,
    invoiceId: json.id ? String(json.id) : null,
    paymentId: json.payment_id ? String(json.payment_id) : null,
    paymentStatus: json.payment_status ?? null,
    paymentUrl: json.invoice_url ?? null,
    payAddress: json.pay_address ?? null,
    payAmount: json.pay_amount != null ? String(json.pay_amount) : null,
    payCurrency: json.pay_currency ?? NOWPAYMENTS_DEMO_PAY_CURRENCY,
  };
};

const createPlisioCharge = async ({
  amount,
  challengeId,
  challengeName,
  balance,
  purchaseSequenceNumber,
  merchantOrderId,
  origin,
  paymentMethod,
  email,
}) => {
  const { apiKey, useSecondary } = resolvePlisioApiKeyForPurchase(purchaseSequenceNumber);

  const callbackBase = PLISIO_CALLBACK_URL || (origin ? `${origin}/api/payments/plisio/callback` : "");
  const callbackUrl = appendJsonCallbackParam(callbackBase);
  const successCallbackUrl = origin
    ? appendJsonCallbackParam(`${origin}/payments?order=${encodeURIComponent(merchantOrderId)}&status=success`)
    : "";
  const failCallbackUrl = origin
    ? appendJsonCallbackParam(`${origin}/checkout/${challengeId}?method=${encodeURIComponent(paymentMethod)}&status=cancelled`)
    : "";
  const successInvoiceUrl = origin
    ? `${origin}/payments?order=${encodeURIComponent(merchantOrderId)}&status=success`
    : "";
  const failInvoiceUrl = origin
    ? `${origin}/checkout/${challengeId}?method=${encodeURIComponent(paymentMethod)}&status=cancelled`
    : "";

  const params = new URLSearchParams({
    source_currency: PLISIO_SOURCE_CURRENCY,
    source_amount: String(amount),
    order_number: merchantOrderId,
    order_name: `${challengeName} Challenge - $${balance.toLocaleString()} account`,
    email: email || "customer@updownx.local",
    api_key: apiKey,
    return_existing: "1",
  });

  if (PLISIO_CURRENCY) {
    params.set("currency", PLISIO_CURRENCY);
  }
  if (callbackUrl) {
    params.set("callback_url", callbackUrl);
  }
  if (successCallbackUrl) {
    params.set("success_callback_url", successCallbackUrl);
  }
  if (failCallbackUrl) {
    params.set("fail_callback_url", failCallbackUrl);
  }
  if (successInvoiceUrl) {
    params.set("success_invoice_url", successInvoiceUrl);
  }
  if (failInvoiceUrl) {
    params.set("fail_invoice_url", failInvoiceUrl);
  }

  const response = await fetch(`${PLISIO_BASE_URL}/invoices/new?${params.toString()}`, {
    method: "GET",
  });

  const bodyText = await response.text();
  let parsed = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed || parsed.status !== "success") {
    const message = parsed?.data?.message || bodyText || "Plisio request failed.";
    throw new Error(message);
  }

  if (useSecondary) {
    log.info("plisio", `Purchase #${purchaseSequenceNumber} routed via secondary API key`);
  }

  const data = parsed.data || {};
  const txnId = data.txn_id ? String(data.txn_id) : null;
  const invoiceUrl = data.invoice_url || (txnId ? `https://plisio.net/invoice/${txnId}` : null);

  return {
    demoMode: false,
    invoiceId: txnId,
    paymentId: txnId,
    paymentStatus: data.status ?? null,
    paymentUrl: invoiceUrl,
    payAddress: data.wallet_hash ?? null,
    payAmount: data.amount != null ? String(data.amount) : null,
    payCurrency: data.currency || data.psys_cid || PLISIO_CURRENCY || null,
    useSecondary,
  };
};

const isValidAccountId = (value) => typeof value === "string" && /^\d{12}$/.test(value);

// Records coupon usage when an order reaches COMPLETED status. Idempotent via unique(coupon_id,user_id).
const recordCouponUsageIfCompleted = async (order, db = pool) => {
  if (!order || !order.coupon_id || !order.user_id || !order.id) return;
  try {
    await db.query(
      "INSERT INTO coupon_usages (coupon_id, user_id, order_id) VALUES ($1, $2, $3) ON CONFLICT (coupon_id, user_id) DO NOTHING",
      [order.coupon_id, order.user_id, order.id],
    );
  } catch (err) {
    console.error("[coupons] failed to record usage for order", order.id, err);
  }
};

const creditBalanceForOrder = async (userId, orderId, challenge, db = pool) => {
  // Check if already credited
  const existing = await db.query(
    "SELECT 1 FROM balance_transactions WHERE challenge_order_id = $1 LIMIT 1",
    [orderId],
  );
  if (existing.rowCount) {
    return; // Already credited
  }

  // Insert balance transaction
  await db.query(
    `INSERT INTO balance_transactions(user_id, challenge_order_id, challenge_id, challenge_name, amount, type, description)
     VALUES($1, $2, $3, $4, $5, 'credit', $6)`,
    [userId, orderId, challenge.id, challenge.name, challenge.balance, `Challenge ${challenge.name} purchased`],
  );

  // Upsert balance
  await db.query(
    `INSERT INTO balances(user_id, balance, updated_at)
     VALUES($1, $2, NOW())
     ON CONFLICT(user_id) DO UPDATE SET
       balance = balances.balance + $2,
       updated_at = NOW()`,
    [userId, challenge.balance],
  );

  log.ok("balance", `Credited $${challenge.balance} to user ${userId} for order ${orderId} (${challenge.name})`);

  try {
    await creditPartnerCommission(userId, orderId, db);
  } catch (commissionError) {
    log.error("commission", `Failed for order ${orderId}`, { error: commissionError?.message || String(commissionError) });
  }
};

// Credit partner commission when a referred user completes a purchase.
// All direct referrals earn 50%. Manager 10% is a separate future sub-partner feature.
const creditPartnerCommission = async (userId, orderId, db = pool) => {
  // Check if user was referred by a partner
  const referral = await db.query(
    "SELECT partner_id FROM partner_referrals WHERE user_id = $1",
    [userId],
  );
  if (!referral.rowCount) return;

  const partnerId = referral.rows[0].partner_id;
  const commissionRate = PARTNER_PRIMARY_COMMISSION_RATE;

  // Get order amount (what the user actually paid)
  const order = await db.query(
    "SELECT amount FROM challenge_orders WHERE id = $1",
    [orderId],
  );
  if (!order.rowCount) return;

  const commissionAmount = Math.round(Number(order.rows[0].amount) * commissionRate * 100) / 100;

  // Insert commission idempotently
  await db.query(
    `INSERT INTO partner_commissions(partner_id, user_id, order_id, amount, status)
     VALUES($1, $2, $3, $4, 'pending')
     ON CONFLICT(order_id) DO NOTHING`,
    [partnerId, userId, orderId, commissionAmount],
  );

  log.ok("commission", `Credited $${commissionAmount} to partner ${partnerId} for order ${orderId} (user ${userId})`);
};

const syncChallengeCreditsForUser = async (userId, db = pool) => {
  const completedOrders = await db.query(
    `SELECT co.id, co.challenge_id
     FROM challenge_orders co
     WHERE co.user_id = $1
       AND co.status = $2
     ORDER BY co.created_at ASC`,
    [userId, PAYMENT_STATUS.COMPLETED],
  );

  for (const order of completedOrders.rows) {
    const challenge = challenges.find((item) => item.id === order.challenge_id);
    if (!challenge) {
      continue;
    }

    await creditBalanceForOrder(userId, order.id, challenge, db);
  }
};

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const calcPositionUnrealizedPnl = ({ side, entryPrice, markPrice, sizeUsdt, leverage }) => {
  const entry = Number(entryPrice);
  const mark = Number(markPrice);
  const size = Number(sizeUsdt);
  const lev = Number(leverage);

  if (
    !Number.isFinite(entry) || entry <= 0 ||
    !Number.isFinite(mark) || mark <= 0 ||
    !Number.isFinite(size) || size <= 0 ||
    !Number.isFinite(lev) || lev <= 0
  ) {
    return 0;
  }

  // `size` (= size_usdt) is the NOTIONAL exposure (already includes leverage),
  // matching the client's `calcPnl` and how `margin = size / leverage` is
  // derived on the trading screen. The previous implementation multiplied
  // qty by `leverage` again, which inflated unrealized PnL by `leverage×`
  // and falsely tripped the 5%-daily / 10%-total drawdown checks for any
  // user with an open leveraged position when /api/accounts was polled,
  // permanently flipping COMPLETED → FAILED.
  void lev;
  const qty = size / entry;
  const normalizedSide = String(side || "").toLowerCase();
  const pnl = normalizedSide === "short"
    ? (entry - mark) * qty
    : (mark - entry) * qty;

  return roundMoney(pnl);
};

const startOfUtcDay = (timestamp) => {
  const date = new Date(timestamp);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
};

const addUtcDays = (timestamp, days) => {
  const date = new Date(timestamp);
  date.setUTCDate(date.getUTCDate() + days);
  return date.getTime();
};

const countTradingDaysForStage = async (userId, orderId, stageStart, db = pool) => {
  const stageStartMs = new Date(stageStart || Date.now()).getTime();
  if (!Number.isFinite(stageStartMs)) return 0;

  const result = await db.query(
    `SELECT COUNT(DISTINCT TO_CHAR(
              TO_TIMESTAMP((CASE
                WHEN type = 'market' THEN COALESCE(filled_at_ms, created_at_ms)
                ELSE filled_at_ms
              END)::double precision / 1000) AT TIME ZONE 'UTC',
              'YYYY-MM-DD'
            ))::int AS days
       FROM trading_order_history
       WHERE user_id = $1
         AND order_id = $2
         AND (type = 'market' OR filled_at_ms IS NOT NULL)
         AND (CASE
               WHEN type = 'market' THEN COALESCE(filled_at_ms, created_at_ms)
               ELSE filled_at_ms
             END) >= $3`,
    [userId, orderId, stageStartMs],
  );

  return Number(result.rows[0]?.days || 0);
};

const normalizeTransactionAmount = (amount, type) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount === 0) {
    return 0;
  }

  if (numericAmount < 0) {
    return numericAmount;
  }

  const normalizedType = String(type || "credit").toLowerCase();
  const isDebitType =
    normalizedType.includes("debit") ||
    normalizedType.includes("withdraw") ||
    normalizedType.includes("fee") ||
    normalizedType.includes("loss");

  return isDebitType ? -numericAmount : numericAmount;
};

const buildTradingPerformance = async (userId, range = "7D", db = pool, orderId = null) => {
  await syncChallengeCreditsForUser(userId, db);

  const orderFilter = orderId ? " AND challenge_order_id = $2" : "";
  const tradingOrderFilter = orderId ? " AND order_id = $2" : "";
  const params = orderId ? [userId, orderId] : [userId];

  const [balanceRes, txRes, orderHistoryRes, tradeHistoryRes] = await Promise.all([
    db.query("SELECT balance FROM balances WHERE user_id = $1", [userId]),
    db.query(
      `SELECT amount, type, created_at
       FROM balance_transactions
       WHERE user_id = $1${orderFilter}
       ORDER BY created_at ASC, id ASC`,
      params,
    ),
    db.query(
      `SELECT type, size_usdt, created_at_ms, filled_at_ms
       FROM trading_order_history
       WHERE user_id = $1${tradingOrderFilter}
       ORDER BY created_at_ms ASC, id ASC`,
      params,
    ),
    db.query(
      `SELECT pnl, closed_at
       FROM trading_trade_history
       WHERE user_id = $1${tradingOrderFilter}
       ORDER BY closed_at ASC, id ASC`,
      params,
    ),
  ]);

  const globalBalance = balanceRes.rowCount ? Number(balanceRes.rows[0].balance) : 0;

  const balanceEvents = txRes.rows
    .map((row) => ({
      ts: new Date(row.created_at).getTime(),
      delta: roundMoney(normalizeTransactionAmount(row.amount, row.type)),
      kind: "balance",
    }))
    .filter((event) => Number.isFinite(event.ts) && Number.isFinite(event.delta) && event.delta !== 0);

  // A trading fee is charged at the moment an order actually executes:
  //   • Market orders: their single OH row already represents the fill.
  //   • Limit / trigger orders: the OH row written by `executeOrder` carries
  //     a non-null `filled_at_ms`. Older client builds also wrote a placement
  //     OH row with `filled_at_ms = NULL` AND a separate fill row, so we must
  //     count exactly one fee per order. Counting only fills (or markets)
  //     gives the correct result for both legacy and new data.
  const feeEvents = orderHistoryRes.rows
    .map((row) => {
      const type = String(row.type || "").toLowerCase();
      const sizeUsdt = Number(row.size_usdt);
      const placedAt = Number(row.created_at_ms);
      const filledAt = row.filled_at_ms != null ? Number(row.filled_at_ms) : null;

      if (!Number.isFinite(sizeUsdt) || sizeUsdt <= 0) return null;

      if (type === "market") {
        const ts = Number.isFinite(filledAt) && filledAt > 0 ? filledAt : placedAt;
        if (!Number.isFinite(ts) || ts <= 0) return null;
        return {
          ts,
          delta: roundMoney(-sizeUsdt * TRADING_FEE_RATE.market),
          kind: "fee",
        };
      }

      if ((type === "limit" || type === "trigger") && filledAt && filledAt > 0) {
        return {
          ts: filledAt,
          delta: roundMoney(-sizeUsdt * TRADING_FEE_RATE[type]),
          kind: "fee",
        };
      }

      return null;
    })
    .filter(Boolean);

  const pnlEvents = tradeHistoryRes.rows
    .map((row) => ({
      ts: Number(row.closed_at),
      delta: roundMoney(Number(row.pnl)),
      kind: "pnl",
    }))
    .filter((event) => Number.isFinite(event.ts) && event.ts > 0 && Number.isFinite(event.delta) && event.delta !== 0);

  const events = [...balanceEvents, ...feeEvents, ...pnlEvents].sort((left, right) => {
    if (left.ts !== right.ts) {
      return left.ts - right.ts;
    }
    return left.kind.localeCompare(right.kind);
  });

  const totalCredits = roundMoney(
    balanceEvents.reduce((sum, event) => sum + (event.delta > 0 ? event.delta : 0), 0),
  );
  const totalFees = roundMoney(
    feeEvents.reduce((sum, event) => sum + Math.abs(event.delta), 0),
  );
  const realizedProfit = roundMoney(
    pnlEvents.reduce((sum, event) => sum + event.delta, 0),
  );

  const totalEventDelta = roundMoney(events.reduce((sum, event) => sum + event.delta, 0));

  // When filtering by orderId, compute currentBalance from events (starting at 0 + all deltas)
  // because the global balances table holds the sum of ALL challenges.
  // For per-challenge view: startingBalance = 0, currentBalance = sum of all events for this challenge.
  let currentBalance;
  let startingBalance;
  if (orderId) {
    startingBalance = 0;
    currentBalance = roundMoney(totalEventDelta);
  } else {
    currentBalance = globalBalance;
    startingBalance = roundMoney(currentBalance - totalEventDelta);
    if (Math.abs(startingBalance) < 0.01) {
      startingBalance = 0;
    }
  }

  const now = Date.now();
  const earliestEventTs = events.length ? events[0].ts : now;
  let rangeStart = startOfUtcDay(addUtcDays(now, -6));

  if (range === "1M") {
    rangeStart = startOfUtcDay(addUtcDays(now, -29));
  } else if (range === "ALL") {
    rangeStart = startOfUtcDay(earliestEventTs);
  }

  const balanceAtRangeStart = roundMoney(
    startingBalance +
      events
        .filter((event) => event.ts < rangeStart)
        .reduce((sum, event) => sum + event.delta, 0),
  );

  const series = [{ ts: rangeStart, balance: balanceAtRangeStart }];
  let runningBalance = balanceAtRangeStart;
  let eventIndex = events.findIndex((event) => event.ts >= rangeStart);
  if (eventIndex === -1) {
    eventIndex = events.length;
  }

  const todayStart = startOfUtcDay(now);
  for (let bucketStart = rangeStart; bucketStart < todayStart; bucketStart = addUtcDays(bucketStart, 1)) {
    const bucketEnd = addUtcDays(bucketStart, 1) - 1;
    while (eventIndex < events.length && events[eventIndex].ts <= bucketEnd) {
      runningBalance = roundMoney(runningBalance + events[eventIndex].delta);
      eventIndex += 1;
    }
    series.push({ ts: bucketEnd, balance: runningBalance });
  }

  while (eventIndex < events.length && events[eventIndex].ts <= now) {
    runningBalance = roundMoney(runningBalance + events[eventIndex].delta);
    eventIndex += 1;
  }

  const finalBalance = roundMoney(currentBalance);
  if (!series.length || series[series.length - 1].ts !== now) {
    series.push({ ts: now, balance: finalBalance });
  } else {
    series[series.length - 1].balance = finalBalance;
  }

  const changeAmount = roundMoney(finalBalance - balanceAtRangeStart);
  const changePercent = balanceAtRangeStart === 0
    ? 0
    : roundMoney((changeAmount / balanceAtRangeStart) * 100);
  const peakBalance = series.reduce((max, point) => Math.max(max, point.balance), finalBalance);
  const equityHealth = peakBalance > 0
    ? roundMoney(Math.max(0, Math.min(100, (finalBalance / peakBalance) * 100)))
    : 100;

  return {
    currentBalance: finalBalance,
    changeAmount,
    changePercent,
    realizedProfit,
    totalCredits,
    totalFees,
    startingBalance,
    equityHealth,
    series,
  };
};

const generateNumericAccountId = () =>
  Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");

const findUniqueAccountId = async (reservedAccountIds = new Set()) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const accountId = generateNumericAccountId();
    if (reservedAccountIds.has(accountId)) {
      continue;
    }

    const existing = await pool.query("SELECT 1 FROM app_users WHERE account_id = $1 LIMIT 1", [accountId]);
    if (!existing.rowCount) {
      return accountId;
    }
  }

  throw new Error("Failed to generate unique account_id.");
};

const backfillAccountIds = async () => {
  
  // ─── Partner / Affiliate System ───
  await pool.query(`
    CREATE TABLE IF NOT EXISTS partners (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      surname TEXT NOT NULL DEFAULT '',
      account_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      invitation_code TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_referral_links (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      label TEXT NOT NULL DEFAULT 'Custom Link',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_referrals (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      invitation_code TEXT NOT NULL,
      registered_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_commissions (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      order_id INTEGER NOT NULL REFERENCES challenge_orders(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(order_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_clicks (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      invitation_code TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Payouts table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS partner_payouts (
      id SERIAL PRIMARY KEY,
      partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
      amount NUMERIC NOT NULL,
      method TEXT NOT NULL DEFAULT 'USDT_TRC20',
      wallet TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'processing',
      period_start DATE,
      period_end DATE,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Add missing columns to existing tables (idempotent ALTERs)
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS payout_wallet TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS payout_method TEXT NOT NULL DEFAULT 'USDT_TRC20'`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'Bronze'`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS max_promo_discount_percent INTEGER NOT NULL DEFAULT ${DEFAULT_PARTNER_PROMO_MAX_DISCOUNT}`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS website TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS company TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS social_linkedin TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS social_youtube TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS social_instagram TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS social_twitter TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS social_facebook TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS social_twitch TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE partners ADD COLUMN IF NOT EXISTS social_tiktok TEXT NOT NULL DEFAULT ''`);
  await pool.query(
    `UPDATE partners
        SET max_promo_discount_percent = LEAST(${ABSOLUTE_PARTNER_PROMO_MAX_DISCOUNT}, GREATEST(1, COALESCE(max_promo_discount_percent, ${DEFAULT_PARTNER_PROMO_MAX_DISCOUNT})))`
  );
  await pool.query(
    `UPDATE partners
        SET max_promo_discount_percent = ${ABSOLUTE_PARTNER_PROMO_MAX_DISCOUNT}
      WHERE LOWER(email) = ANY($1::text[])`,
    [Array.from(SPECIAL_PARTNER_PROMO_DISCOUNT_EMAILS)],
  );
  await pool.query(`ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE partner_commissions ADD COLUMN IF NOT EXISTS payout_id INTEGER REFERENCES partner_payouts(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE partner_referrals ADD COLUMN IF NOT EXISTS link_id INTEGER REFERENCES partner_referral_links(id) ON DELETE SET NULL`);
  await pool.query(`
    UPDATE partner_referrals pr
       SET link_id = prl.id
      FROM partner_referral_links prl
     WHERE pr.link_id IS NULL
       AND pr.partner_id = prl.partner_id
       AND LOWER(pr.invitation_code) = LOWER(prl.token)
  `);
  await pool.query(
    `UPDATE partner_commissions pc
        SET amount = ROUND((co.amount::numeric * ${PARTNER_PRIMARY_COMMISSION_RATE}), 2)
       FROM challenge_orders co
       JOIN partner_referrals pr
         ON pr.user_id = co.user_id
      WHERE pc.order_id = co.id
        AND pr.partner_id = pc.partner_id
        AND pc.status IN ('${PARTNER_COMMISSION_STATUS.PENDING}', '${PARTNER_COMMISSION_STATUS.APPROVED}')`,
  );

  // User withdrawal requests table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_withdrawal_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      challenge_id INTEGER,
      amount NUMERIC NOT NULL,
      coin TEXT NOT NULL DEFAULT 'USDT',
      network TEXT NOT NULL DEFAULT 'TRC-20',
      address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // User withdrawal settings
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_withdrawal_settings (
      user_id INTEGER PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
      method TEXT NOT NULL DEFAULT 'USDT_TRC20',
      wallet TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  const users = await pool.query("SELECT id, account_id FROM app_users ORDER BY id ASC");
  const seenAccountIds = new Set();

  for (const user of users.rows) {
    const currentAccountId = typeof user.account_id === "string" ? user.account_id : "";
    const accountIdIsReusable = isValidAccountId(currentAccountId) && !seenAccountIds.has(currentAccountId);

    if (accountIdIsReusable) {
      seenAccountIds.add(currentAccountId);
      await ensurePaymentsTable(currentAccountId);
      continue;
    }

    const nextAccountId = await findUniqueAccountId(seenAccountIds);
    await pool.query("UPDATE app_users SET account_id = $1 WHERE id = $2", [nextAccountId, user.id]);
    seenAccountIds.add(nextAccountId);
    await ensurePaymentsTable(nextAccountId);
  }

  // Seed fake withdrawal history for spekylanttyt@gmail.com
  try {
    const seedUser = await pool.query(
      `SELECT id FROM app_users WHERE email = 'spekylanttyt@gmail.com' LIMIT 1`
    );
    if (seedUser.rows.length > 0) {
      const seedUserId = seedUser.rows[0].id;
      const existing = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM user_withdrawal_requests WHERE user_id = $1`,
        [seedUserId],
      );
      if (existing.rows[0].cnt === 0) {
        const seedChallenge = await pool.query(
          `SELECT id FROM challenge_orders WHERE user_id = $1 ORDER BY id DESC LIMIT 1`,
          [seedUserId],
        );
        const chId = seedChallenge.rows[0]?.id || null;
        await pool.query(
          `INSERT INTO user_withdrawal_requests (user_id, challenge_id, amount, coin, network, address, status, paid_at, created_at)
           VALUES
             ($1, $2, 4100, 'USDT', 'TRC-20', 'THDfMTPa...u8J1', 'paid', '2026-05-01 10:00:00+00', '2026-05-01 08:00:00+00'),
             ($1, $2, 900,  'USDT', 'TRC-20', 'THDfMTPa...u8J1', 'paid', '2026-05-04 14:30:00+00', '2026-05-04 09:00:00+00'),
             ($1, $2, 1100, 'USDT', 'TRC-20', 'THDfMTPa...u8J1', 'paid', '2026-05-08 11:20:00+00', '2026-05-08 08:15:00+00')`,
          [seedUserId, chId],
        );
        console.log("[seed] Inserted fake withdrawal history for spekylanttyt@gmail.com");
      }
    }
  } catch (err) {
    console.error("[seed] Failed to insert fake withdrawals:", err.message);
  }
};

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use((req, res, next) => {
  if (isQuietRequest(req.method, req.path)) {
    return next();
  }
  const start = Date.now();
  const body = sanitizeBody(req.body);
  const hasBody = body && typeof body === "object" && Object.keys(body).length > 0;
  res.on("finish", () => {
    const ms = Date.now() - start;
    const status = res.statusCode;
    const tag = status >= 500 ? "http5xx" : status >= 400 ? "http4xx" : "http";
    const line = `${req.method.padEnd(4)} ${req.path}  ->  ${status} (${ms}ms)`;
    if (hasBody) {
      log.info(tag, line, body);
    } else {
      log.info(tag, line);
    }
  });
  next();
});

const ensureSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      surname TEXT NOT NULL DEFAULT '',
      account_id TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      invitation_code TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Add columns if they don't exist (for existing databases)
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS surname TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS invitation_code TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS account_id TEXT`);
  await backfillAccountIds();
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS app_users_account_id_key ON app_users(account_id)`);
  await pool.query(`ALTER TABLE app_users ALTER COLUMN account_id SET NOT NULL`);

  // Ensure Admin user (ID=0) exists so trading history foreign keys don't fail
  await pool.query(`
    INSERT INTO app_users (id, name, surname, account_id, email, password, invitation_code)
    VALUES (0, 'Admin', '', '000000000000', 'admin', 'admin', '')
    ON CONFLICT (id) DO NOTHING
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS challenge_orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      challenge_id TEXT NOT NULL,
      challenge_name TEXT NOT NULL,
      amount NUMERIC NOT NULL,
      billing_full_name TEXT NOT NULL DEFAULT '',
      billing_email TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '${PAYMENT_STATUS.PENDING}',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS provider TEXT`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS provider_invoice_id TEXT`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS provider_payment_id TEXT`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS merchant_order_id TEXT`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS payment_url TEXT`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS billing_full_name TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS billing_email TEXT NOT NULL DEFAULT ''`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS pay_address TEXT`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS pay_amount TEXT`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS pay_currency TEXT`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS stage INTEGER NOT NULL DEFAULT 1`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS stage_started_at TIMESTAMPTZ`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS challenge_type TEXT NOT NULL DEFAULT 'challenge'`);
  await pool.query(`ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS p_work BOOLEAN`);
  // Normalize legacy status values — only touch rows that are NOT already in a valid canonical state.
  // IMPORTANT: 'FAILED' is a valid permanent status and must NEVER be overwritten by this migration.
  await pool.query(
    `UPDATE challenge_orders
     SET status = CASE
       WHEN LOWER(status) IN ('completed', 'finished') THEN '${PAYMENT_STATUS.COMPLETED}'
       WHEN LOWER(status) IN ('cancelled', 'canceled', 'expired') THEN '${PAYMENT_STATUS.CANCELLED}'
       ELSE '${PAYMENT_STATUS.PENDING}'
     END
     WHERE status NOT IN ('${PAYMENT_STATUS.COMPLETED}', '${PAYMENT_STATUS.CANCELLED}', '${PAYMENT_STATUS.PENDING}', 'FAILED', 'PASSED')`,
  );
  await pool.query(
    `UPDATE challenge_orders
     SET provider_payment_id = provider_invoice_id
     WHERE provider = 'nowpayments'
       AND provider_payment_id IS NULL
       AND (payment_url IS NULL OR payment_url = '')`,
  );

  // Create balances table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS balances (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      balance NUMERIC NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id)
    );
  `);

  // Give Admin 100000 balance default
  await pool.query(`
    INSERT INTO balances(user_id, balance) VALUES(0, 100000)
    ON CONFLICT(user_id) DO NOTHING
  `);

  // Create balance_transactions table to track each credit/debit
  await pool.query(`
    CREATE TABLE IF NOT EXISTS balance_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      challenge_order_id INTEGER,
      challenge_id TEXT,
      challenge_name TEXT,
      amount NUMERIC NOT NULL,
      type TEXT NOT NULL DEFAULT 'credit',
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Backfill balances for completed orders that haven't been credited yet
  const completedOrders = await pool.query(
    `SELECT co.id, co.user_id, co.challenge_id, co.challenge_name
     FROM challenge_orders co
     WHERE co.status = '${PAYMENT_STATUS.COMPLETED}'
       AND NOT EXISTS (
         SELECT 1 FROM balance_transactions bt WHERE bt.challenge_order_id = co.id
       )
     ORDER BY co.created_at ASC`,
  );
  for (const order of completedOrders.rows) {
    const challenge = challenges.find((c) => c.id === order.challenge_id);
    if (challenge) {
      await creditBalanceForOrder(order.user_id, order.id, challenge);
    }
  }

  // ─── Trading Tables ───
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trading_positions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      side TEXT NOT NULL CHECK (side IN ('long','short')),
      symbol TEXT NOT NULL,
      pair TEXT NOT NULL,
      entry_price NUMERIC NOT NULL,
      size_usdt NUMERIC NOT NULL,
      leverage NUMERIC NOT NULL,
      margin NUMERIC NOT NULL,
      liq_price NUMERIC NOT NULL,
      take_profit NUMERIC,
      stop_loss NUMERIC,
      open_time BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE trading_positions
    ADD COLUMN IF NOT EXISTS take_profit NUMERIC
  `);
  await pool.query(`
    ALTER TABLE trading_positions
    ADD COLUMN IF NOT EXISTS stop_loss NUMERIC
  `);
  await pool.query(`ALTER TABLE trading_positions ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES challenge_orders(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE trading_pending_orders ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES challenge_orders(id) ON DELETE CASCADE`);
  // Per-position margin mode. Existing rows keep CROSS via the column DEFAULT
  // so the UI no longer "snaps" to the global picker on reload.
  await pool.query(`
    ALTER TABLE trading_positions
    ADD COLUMN IF NOT EXISTS margin_type TEXT NOT NULL DEFAULT 'CROSS'
    CHECK (margin_type IN ('CROSS','ISOLATED'))
  `);
  await pool.query(`
    ALTER TABLE trading_pending_orders
    ADD COLUMN IF NOT EXISTS margin_type TEXT NOT NULL DEFAULT 'CROSS'
    CHECK (margin_type IN ('CROSS','ISOLATED'))
  `);
  await pool.query(`ALTER TABLE trading_order_history ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES challenge_orders(id) ON DELETE CASCADE`);
  await pool.query(`ALTER TABLE trading_trade_history ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES challenge_orders(id) ON DELETE CASCADE`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trading_pending_orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('limit','trigger')),
      side TEXT NOT NULL CHECK (side IN ('long','short')),
      symbol TEXT NOT NULL,
      pair TEXT NOT NULL,
      price NUMERIC NOT NULL,
      trigger_price NUMERIC,
      exec_type TEXT CHECK (exec_type IN ('limit','market')),
      trigger_direction TEXT CHECK (trigger_direction IN ('up','down')),
      size_usdt NUMERIC NOT NULL,
      leverage NUMERIC NOT NULL,
      margin NUMERIC NOT NULL,
      created_at_ms BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trading_order_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      side TEXT NOT NULL CHECK (side IN ('long','short')),
      symbol TEXT NOT NULL,
      price NUMERIC NOT NULL,
      size_usdt NUMERIC NOT NULL,
      leverage NUMERIC NOT NULL,
      status TEXT NOT NULL DEFAULT 'filled',
      created_at_ms BIGINT NOT NULL,
      filled_at_ms BIGINT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trading_trade_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      side TEXT NOT NULL CHECK (side IN ('long','short')),
      symbol TEXT NOT NULL,
      entry_price NUMERIC NOT NULL,
      exit_price NUMERIC NOT NULL,
      size_usdt NUMERIC NOT NULL,
      leverage NUMERIC NOT NULL,
      pnl NUMERIC NOT NULL,
      opened_at BIGINT NOT NULL,
      closed_at BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // ─── Balance Snapshots (for /control-panel chart) ───
  await pool.query(`
    CREATE TABLE IF NOT EXISTS balance_snapshots (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES challenge_orders(id) ON DELETE CASCADE,
      balance NUMERIC NOT NULL,
      ts BIGINT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_balance_snapshots_user_order ON balance_snapshots(user_id, order_id, ts)`);

  // ─── Price Snapshots (market price of traded asset, per-challenge) ───
  // Append-only timeseries: every new price observation gets its own row.
  // Used to draw the price curve on /control-panel alongside balance history.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS price_snapshots (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES challenge_orders(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      pair TEXT NOT NULL,
      price NUMERIC NOT NULL,
      ts BIGINT NOT NULL,
      source TEXT NOT NULL DEFAULT 'tick',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_price_snapshots_user_order_ts ON price_snapshots(user_id, order_id, ts)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_price_snapshots_order_symbol_ts ON price_snapshots(order_id, symbol, ts)`);

  // ─── Coupon Codes ───
  await pool.query(`
    CREATE TABLE IF NOT EXISTS coupon_codes (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL,
      discount_percent NUMERIC NOT NULL DEFAULT 0,
      max_uses_per_user INTEGER NOT NULL DEFAULT 1,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      expires_at DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`ALTER TABLE coupon_codes ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL`);
  await pool.query(`ALTER TABLE coupon_codes ADD COLUMN IF NOT EXISTS expires_at DATE`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_coupon_codes_partner_id ON coupon_codes(partner_id)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coupon_usages (
      id SERIAL PRIMARY KEY,
      coupon_id INTEGER NOT NULL REFERENCES coupon_codes(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      order_id INTEGER,
      used_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(coupon_id, user_id)
    );
  `);

  // Track which coupon was applied to each order (so usage can be recorded at payment completion)
  await pool.query(`
    ALTER TABLE challenge_orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupon_codes(id);
  `);

  // Release coupons that were "burned" by orders that never reached COMPLETED status.
  // This is safe because usage should only be consumed on successful payment.
  await pool.query(`
    DELETE FROM coupon_usages cu
    USING challenge_orders co
    WHERE cu.order_id = co.id AND co.status <> '${PAYMENT_STATUS.COMPLETED}'
  `);

  // Seed summer2026 promo code (50% discount, 1 use per account)
  await pool.query(`
    INSERT INTO coupon_codes (code, discount_percent, max_uses_per_user, active)
    VALUES ('summer2026', 50, 1, TRUE)
    ON CONFLICT (code) DO UPDATE SET discount_percent = 50, max_uses_per_user = 1, active = TRUE
  `);

  const users = await pool.query("SELECT id, account_id FROM app_users ORDER BY id ASC");
  for (const user of users.rows) {
    await syncPaymentsTableForUser(user.id, user.account_id);
  }
};

app.get("/api/health", async (_, res) => {
  const now = await pool.query("SELECT NOW()");
  res.json({ ok: true, dbTime: now.rows[0].now });
});

app.get("/api/challenges", (_, res) => {
  res.json(challenges);
});

// ─── Coupon Validation ───
app.post("/api/coupons/validate", requireAuth, async (req, res) => {
  const { code, userId } = req.body;
  if (!ensureAuthorizedUserId(req, res, Number(userId))) return;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ valid: false, message: "Coupon code is required." });
  }

  try {
    const coupon = await pool.query(
      `SELECT *, (expires_at IS NOT NULL AND expires_at::date < CURRENT_DATE) AS is_expired
         FROM coupon_codes
        WHERE LOWER(code) = LOWER($1) AND active = TRUE`,
      [code.trim()],
    );
    if (!coupon.rowCount) {
      return res.json({ valid: false, message: "Invalid coupon code." });
    }

    const couponRow = coupon.rows[0];
    if (couponRow.is_expired) {
      return res.json({ valid: false, message: "Coupon has expired." });
    }

    // Only count usages tied to COMPLETED orders. Usages from cancelled/failed
    // orders (or orphaned rows without an order) must not burn the coupon.
    const usage = await pool.query(
      `SELECT COUNT(*)::int AS cnt
         FROM coupon_usages cu
         JOIN challenge_orders co ON co.id = cu.order_id
        WHERE cu.coupon_id = $1 AND cu.user_id = $2 AND co.status = $3`,
      [couponRow.id, userId, PAYMENT_STATUS.COMPLETED],
    );
    if (usage.rows[0].cnt >= couponRow.max_uses_per_user) {
      return res.json({ valid: false, message: "Coupon already used." });
    }

    return res.json({
      valid: true,
      discountPercent: Number(couponRow.discount_percent),
      code: couponRow.code,
    });
  } catch (error) {
    console.error("[coupons] validate failed", error);
    return res.status(500).json({ valid: false, message: "Failed to validate coupon." });
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { name, surname, email, password, verificationCode, invitationCode } = req.body;
  if (!name || !surname || !email || !password || !verificationCode) {
    console.warn("[register] missing fields", { name, surname, email });
    return res.status(400).json({ message: "Missing required fields." });
  }

  // Verify the email code
  const stored = verificationCodes.get(email.toLowerCase());
  if (!stored) {
    return res.status(400).json({ message: "Verification code not found. Please request a new code." });
  }
  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(email.toLowerCase());
    return res.status(400).json({ message: "Verification code expired. Please request a new code." });
  }
  if (stored.code !== verificationCode) {
    return res.status(400).json({ message: "Invalid verification code." });
  }

  // Code is valid — remove it so it can't be reused
  verificationCodes.delete(email.toLowerCase());

  try {
    console.log("[register] creating user", { email: email.toLowerCase() });
    let insert = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const accountId = await findUniqueAccountId();

      try {
        insert = await pool.query(
          "INSERT INTO app_users(name, surname, account_id, email, password, invitation_code) VALUES($1, $2, $3, $4, $5, $6) RETURNING id, name, surname, account_id, email, created_at",
          [name, surname, accountId, email.toLowerCase(), password, invitationCode || ""]
        );
        break;
      } catch (error) {
        if (error.code === "23505" && error.constraint === "app_users_account_id_key") {
          console.warn("[register] account_id collision", { email: email.toLowerCase(), accountId });
          continue;
        }
        throw error;
      }
    }

    if (!insert) {
      throw new Error("Unable to allocate account_id for user registration.");
    }

    await ensurePaymentsTable(insert.rows[0].account_id);

    // Link user to partner if invitation_code matches
    if (invitationCode && invitationCode.trim()) {
      const code = invitationCode.trim();
      let partnerId = null;
      let referralLinkId = null;

      // Check partner's primary invitation_code
      const partnerByCode = await pool.query(
        "SELECT id FROM partners WHERE LOWER(invitation_code) = LOWER($1)",
        [code]
      );
      if (partnerByCode.rowCount) {
        partnerId = partnerByCode.rows[0].id;
      } else {
        // Check extra referral link tokens
        const linkByToken = await pool.query(
          "SELECT id, partner_id FROM partner_referral_links WHERE LOWER(token) = LOWER($1)",
          [code]
        );
        if (linkByToken.rowCount) {
          partnerId = linkByToken.rows[0].partner_id;
          referralLinkId = linkByToken.rows[0].id;
        }
      }

      if (partnerId) {
        await pool.query(
          "INSERT INTO partner_referrals(partner_id, user_id, invitation_code, link_id) VALUES($1, $2, $3, $4) ON CONFLICT(user_id) DO NOTHING",
          [partnerId, insert.rows[0].id, code, referralLinkId]
        );
        console.log(`[register] user ${insert.rows[0].id} linked to partner ${partnerId} via code '${code}'`);
      }
    }

    console.log("[register] success", { userId: insert.rows[0].id });
    return res.status(201).json({
      user: insert.rows[0],
      token: createAuthToken(insert.rows[0].id),
    });
  } catch (error) {
    if (error.code === "23505" && error.constraint === "app_users_email_key") {
      console.warn("[register] duplicate email", { email: email.toLowerCase() });
      return res.status(409).json({ message: "Email already exists." });
    }
    console.error("[register] failed", error);
    return res.status(500).json({ message: "Registration failed." });
  }
});

app.post("/api/auth/send-code", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required" });

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  const html = `
    <div style="background-color: #000000; color: #ffffff; font-family: 'Inter', Helvetica, Arial, sans-serif; padding: 60px 20px; text-align: center; width: 100%; box-sizing: border-box; min-height: 400px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #000000; text-align: center;">
        <tr>
          <td align="center">
            <img src="cid:logo" alt="UPDOWNX" style="height: 35px; margin-bottom: 40px; display: block;" />
            <h1 style="color: #ffffff; font-size: 26px; font-weight: 700; margin-bottom: 15px; margin-top: 0;">Verification Code</h1>
            <p style="color: #a6aabe; font-size: 16px; margin-bottom: 40px; line-height: 1.5; max-width: 400px; margin-left: auto; margin-right: auto;">
              Please use the following 6-digit code to complete your registration. This code is valid for 10 minutes.
            </p>
            
            <div style="background: #013226; border: 1px solid #00ffa3; border-radius: 12px; padding: 20px; max-width: 240px; margin: 0 auto;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #00ffa3;">${code}</span>
            </div>
            
            <p style="color: #5a6270; font-size: 13px; margin-top: 50px;">
              If you didn't request this email, please safely ignore it.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
  const text = [
    "UPDOWNX verification code",
    "",
    `Code: ${code}`,
    "This code is valid for 10 minutes.",
    "",
    "If you did not request this email, ignore it.",
  ].join("\n");

  try {
    const info = await transporter.sendMail({
      from: 'UPDOWNX <verification@updownxpro.com>',
      to: email,
      subject: 'Your Verification Code',
      text,
      html,
      replyTo: "support@updownxpro.com",
      attachments: [{
        filename: 'logo.png',
        path: process.cwd() + '/public/images/logo.png',
        cid: 'logo' // same cid value as in the html img src
      }]
    });
    // Store the code server-side with 10 minute TTL
    verificationCodes.set(email.toLowerCase(), {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    console.log("[send-code] success to", email, info.messageId);
    return res.json({ success: true });
  } catch (error) {
    console.error("[send-code] error", error);
    return res.status(500).json({ message: "Failed to send email" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { email, verificationCode, newPassword } = req.body;

  if (!email || !verificationCode || !newPassword) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const normalizedEmail = String(email).toLowerCase();
  const stored = verificationCodes.get(normalizedEmail);

  if (!stored) {
    return res.status(400).json({ message: "Verification code not found. Please request a new code." });
  }
  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(normalizedEmail);
    return res.status(400).json({ message: "Verification code expired. Please request a new code." });
  }
  if (stored.code !== verificationCode) {
    return res.status(400).json({ message: "Invalid verification code." });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  }

  try {
    const update = await pool.query(
      "UPDATE app_users SET password = $2 WHERE email = $1 RETURNING id",
      [normalizedEmail, newPassword],
    );

    if (!update.rowCount) {
      return res.status(404).json({ message: "Account with this email was not found." });
    }

    // Invalidate one-time code after successful password reset.
    verificationCodes.delete(normalizedEmail);
    return res.json({ success: true });
  } catch (error) {
    console.error("[reset-password] failed", error);
    return res.status(500).json({ message: "Password reset failed." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    console.warn("[login] missing credentials", { email });
    return res.status(400).json({ message: "Missing credentials." });
  }

  if (email === "admin" && password === "admin") {
    console.log("[login] admin fallback login");
    const adminUser = buildAdminUser();
    return res.json({
      user: adminUser,
      token: createAuthToken(adminUser.id),
    });
  }

  try {
    const query = await pool.query(
      "SELECT id, name, surname, account_id, email, created_at FROM app_users WHERE email = $1 AND password = $2",
      [email.toLowerCase(), password],
    );
    if (!query.rowCount) {
      console.warn("[login] invalid credentials", { email: email.toLowerCase() });
      return res.status(401).json({ message: "Invalid credentials." });
    }
    console.log("[login] success", { userId: query.rows[0].id });
    return res.json({
      user: query.rows[0],
      token: createAuthToken(query.rows[0].id),
    });
  } catch (error) {
    console.error("[login] failed", error);
    return res.status(500).json({ message: "Login failed." });
  }
});

app.get("/api/accounts/:userId", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) {
    return;
  }
  const user = await pool.query(
    "SELECT id, name, surname, account_id, email, created_at FROM app_users WHERE id = $1",
    [userId],
  );
  if (!user.rows[0]) {
    return res.json({ user: null, orders: [] });
  }

  const nowMs = Date.now();
  if (nowMs - (accountsSyncLastRun.get(userId) || 0) >= ACCOUNTS_SYNC_THROTTLE_MS) {
    accountsSyncLastRun.set(userId, nowMs);
    await syncPaymentsTableForUser(user.rows[0].id, user.rows[0].account_id);
    await syncChallengeCreditsForUser(userId);
  }
  const paymentsTableIdentifier = getPaymentsTableIdentifier(user.rows[0].account_id);
  await ensurePaymentsTable(user.rows[0].account_id);
  const orders = await pool.query(
    `SELECT id, challenge_name, amount, status, created_at FROM ${paymentsTableIdentifier} ORDER BY created_at DESC`,
  );

  // Get real challenges only: COMPLETED (active), FAILED (permanently stored), PASSED (funded trader).
  // CANCELLED = payment abandoned before challenge started — never show as failed.
  const activeChallenges = await pool.query(
    `SELECT co.id, co.challenge_id, co.challenge_name, co.created_at, co.status, co.stage, co.stage_started_at, co.challenge_type
     FROM challenge_orders co
     WHERE co.user_id = $1 AND UPPER(co.status) IN ('${PAYMENT_STATUS.COMPLETED}', 'FAILED', 'PASSED')
     ORDER BY co.created_at DESC`,
    [userId],
  );

  // Fetch current trading balance from balances table
  const balanceRow = await pool.query("SELECT balance FROM balances WHERE user_id = $1", [userId]);
  const currentTradingBalance = balanceRow.rowCount ? Number(balanceRow.rows[0].balance) : 0;

  // Evaluate challenge progression / failure for each challenge
  const userChallenges = [];
  for (const row of activeChallenges.rows) {
    const challenge = challenges.find((c) => c.id === row.challenge_id)
      || challenges.find((c) => c.name.toLowerCase() === (row.challenge_name || "").toLowerCase());
    const startingBalance = challenge ? challenge.balance : 0;
    let currentStage = row.stage || 1;
    let currentStatus = String(row.status || "").toUpperCase();
    let currentChallengeType = row.challenge_type || 'challenge';
    let currentStageStartedAt = row.stage_started_at || row.created_at;
    const stageStart = currentStageStartedAt;
    let tradingDaysForStage = 0;

    // Calculate per-challenge equity:
    // startingBalance + realizedPnL + unrealizedPnL - fees
    const [tradeRes, orderRes, openPosRes, latestPriceRes] = await Promise.all([
      pool.query(
        "SELECT pnl, closed_at FROM trading_trade_history WHERE user_id = $1 AND order_id = $2",
        [userId, row.id]
      ),
      pool.query(
        "SELECT type, size_usdt, created_at_ms, filled_at_ms FROM trading_order_history WHERE user_id = $1 AND order_id = $2",
        [userId, row.id]
      ),
      pool.query(
        "SELECT side, pair, entry_price, size_usdt, leverage FROM trading_positions WHERE user_id = $1 AND order_id = $2",
        [userId, row.id]
      ),
      pool.query(
        `SELECT DISTINCT ON (pair) pair, price
         FROM price_snapshots
         WHERE user_id = $1 AND order_id = $2
         ORDER BY pair, ts DESC`,
        [userId, row.id]
      ),
    ]);

    const sumTradePnl = (cutoffMs = null, beforeMs = null) => roundMoney(tradeRes.rows.reduce((sum, trade) => {
      const closedAt = Number(trade.closed_at);
      if (cutoffMs != null && closedAt < cutoffMs) return sum;
      if (beforeMs != null && closedAt >= beforeMs) return sum;
      return sum + Number(trade.pnl || 0);
    }, 0));

    const sumOrderFees = (cutoffMs = null, beforeMs = null) => roundMoney(orderRes.rows.reduce((sum, oh) => {
      // Only count an OH row as a charged fee if it represents an executed
      // order. Market rows are always executed; limit/trigger rows are
      // executed only when `filled_at_ms` is set. This dedups against legacy
      // builds that also wrote a placement OH row at order placement.
      if (oh.type !== "market" && !oh.filled_at_ms) return sum;
      const ts = Number(oh.filled_at_ms || oh.created_at_ms);
      if (cutoffMs != null && ts < cutoffMs) return sum;
      if (beforeMs != null && ts >= beforeMs) return sum;
      const feeRate = oh.type === "market" ? TRADING_FEE_RATE.market : TRADING_FEE_RATE.limit;
      return sum + Number(oh.size_usdt) * feeRate;
    }, 0));

    const totalPnl = sumTradePnl();
    const totalFees = sumOrderFees();
    const latestPriceByPair = new Map();
    for (const px of latestPriceRes.rows) {
      const pair = String(px.pair || "");
      const price = Number(px.price);
      if (pair && Number.isFinite(price) && price > 0) {
        latestPriceByPair.set(pair, price);
      }
    }

    let openUnrealizedPnl = 0;
    for (const pos of openPosRes.rows) {
      const entry = Number(pos.entry_price);
      const mark = latestPriceByPair.get(String(pos.pair || "")) ?? entry;
      openUnrealizedPnl += calcPositionUnrealizedPnl({
        side: pos.side,
        entryPrice: entry,
        markPrice: mark,
        sizeUsdt: Number(pos.size_usdt),
        leverage: Number(pos.leverage),
      });
    }
    openUnrealizedPnl = roundMoney(openUnrealizedPnl);

    const computedBalance = roundMoney(startingBalance + totalPnl - totalFees);
    const equityBalance = roundMoney(computedBalance + openUnrealizedPnl);

    // Only evaluate active (COMPLETED) challenges
    if (currentStatus === PAYMENT_STATUS.COMPLETED) {
      const isFunded = currentChallengeType === 'funded';
      const fundedRiskCutoffMs = isFunded ? new Date(currentStageStartedAt).getTime() : null;
      const riskComputedBalance = Number.isFinite(fundedRiskCutoffMs)
        ? roundMoney(startingBalance + sumTradePnl(fundedRiskCutoffMs) - sumOrderFees(fundedRiskCutoffMs))
        : computedBalance;
      const riskEquityBalance = roundMoney(riskComputedBalance + openUnrealizedPnl);
      // Funded: 5% daily, 10% total. Challenge: 5% for both.
      const maxDailyLoss = roundMoney(startingBalance * 0.05);
      const maxTotalLoss = roundMoney(startingBalance * (isFunded ? 0.10 : 0.05));

      // Total loss from starting balance (live equity including unrealizedPnL)
      const totalLost = roundMoney(startingBalance - riskEquityBalance);

      // Daily loss: compute equity at 00:00 UTC today
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();

      const pnlBeforeToday = sumTradePnl(Number.isFinite(fundedRiskCutoffMs) ? fundedRiskCutoffMs : null, todayStartMs);
      const feesBeforeToday = sumOrderFees(Number.isFinite(fundedRiskCutoffMs) ? fundedRiskCutoffMs : null, todayStartMs);

      const dayOpenEquity = roundMoney(startingBalance + pnlBeforeToday - feesBeforeToday);
      const dailyLost = roundMoney(dayOpenEquity - riskEquityBalance); // positive = losing today

      const totalBreached = startingBalance > 0 && totalLost >= maxTotalLoss - 0.005;
      const dailyBreached = startingBalance > 0 && dailyLost >= maxDailyLoss - 0.005;

      if (totalBreached || dailyBreached) {
        currentStatus = "FAILED";
        await pool.query("UPDATE challenge_orders SET status = 'FAILED' WHERE id = $1", [row.id]);
      } else {
        // Check stage advancement by trading days (only days with an opened/filled
        // trade count). There is no calendar timeout: if the target is not met,
        // the challenge simply remains active.
        if (!isFunded) {
          const tier = getTierForBalance(startingBalance);
          const stageIdx = Math.min(Math.max(currentStage - 1, 0), 2);
          const stageData = tier.stages[stageIdx];
          tradingDaysForStage = await countTradingDaysForStage(userId, row.id, stageStart);
          const minDaysMet = stageData.targetAmt === 0 || tradingDaysForStage >= CHALLENGE_MIN_TRADING_DAYS;
          const profitForStage = roundMoney(computedBalance - startingBalance);
          const requiredProfit = tier.stages
            .slice(0, currentStage)
            .reduce((sum, stage) => sum + Number(stage.targetAmt || 0), 0);

          if (stageData.targetAmt > 0 && profitForStage >= requiredProfit - 0.005 && minDaysMet) {
            if (currentStage === 1) {
              currentStage = 2;
              tradingDaysForStage = 0;
              currentStageStartedAt = new Date().toISOString();
              await pool.query(
                "UPDATE challenge_orders SET stage = 2, stage_started_at = NOW() WHERE id = $1",
                [row.id],
              );
            } else if (currentStage === 2) {
              currentStage = 3;
              tradingDaysForStage = 0;
              currentChallengeType = 'funded';
              currentStageStartedAt = new Date().toISOString();
              await pool.query(
                "UPDATE challenge_orders SET stage = 3, status = $2, challenge_type = 'funded', stage_started_at = NOW() WHERE id = $1",
                [row.id, PAYMENT_STATUS.COMPLETED],
              );
            }
          }
        } // end !isFunded
      }
    }


    const stageIdxForResp = Math.min(currentStage - 1, 2);
    const tierForResp = getTierForBalance(startingBalance);
    const isFundedRow = currentChallengeType === 'funded';
    const responseFundedCutoffMs = isFundedRow ? new Date(currentStageStartedAt).getTime() : null;
    const responseComputedBalance = Number.isFinite(responseFundedCutoffMs)
      ? roundMoney(startingBalance + sumTradePnl(responseFundedCutoffMs) - sumOrderFees(responseFundedCutoffMs))
      : computedBalance;
    const responseEquityBalance = roundMoney(responseComputedBalance + openUnrealizedPnl);
    if (!isFundedRow && currentStatus === PAYMENT_STATUS.COMPLETED && tradingDaysForStage === 0 && currentStage <= 2) {
      tradingDaysForStage = await countTradingDaysForStage(userId, row.id, currentStageStartedAt);
    }
    userChallenges.push({
      id: row.id,
      challenge_id: row.challenge_id,
      challenge_name: row.challenge_name,
      balance: startingBalance,
      currentBalance: responseEquityBalance,
      stage: currentStage,
      status: currentStatus,
      created_at: row.created_at,
      stageStartedAt: currentStageStartedAt,
      challengeType: currentChallengeType,
      maxDailyLoss: roundMoney(startingBalance * 0.05),
      maxTotalLoss: roundMoney(startingBalance * (isFundedRow ? 0.10 : 0.05)),
      tradingDays: tradingDaysForStage,
      minTradingDays: currentStage <= 2 ? CHALLENGE_MIN_TRADING_DAYS : 0,
      tradingDaysRemaining: currentStage <= 2 ? Math.max(0, CHALLENGE_MIN_TRADING_DAYS - tradingDaysForStage) : 0,
    });
  }

  return res.json({ user: user.rows[0], orders: orders.rows, challenges: userChallenges });
});

// ── Admin: update challenge stage/status ──────────────────────────────────
// ── Admin: get any user's challenges ──────────────────────────────────────
app.get("/api/admin/accounts/:userId", requireAuth, async (req, res) => {
  if (req.authUserId !== 0) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId) || userId < 0) {
    return res.status(400).json({ message: "Invalid userId" });
  }
  try {
    const userRow = await pool.query(
      "SELECT id, name, surname, account_id, email, created_at FROM app_users WHERE id = $1",
      [userId]
    );
    if (!userRow.rowCount) {
      return res.status(404).json({ message: "User not found" });
    }
    const u = userRow.rows[0];
    const challengeRows = await pool.query(
      `SELECT id, challenge_id, challenge_name, status, stage, created_at
       FROM challenge_orders
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return res.json({ user: u, challenges: challengeRows.rows });
  } catch (err) {
    console.error("[admin] get accounts error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// ── Mark challenge as FAILED (called by client-side drawdown check) ────────
app.post("/api/trading/:userId/challenge/:orderId/fail", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  const orderId = Number(req.params.orderId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  try {
    const result = await pool.query(
      "UPDATE challenge_orders SET status = 'FAILED' WHERE id = $1 AND user_id = $2 AND status = $3 RETURNING id",
      [orderId, userId, PAYMENT_STATUS.COMPLETED],
    );
    if (result.rowCount === 0) {
      return res.json({ ok: false, message: "Challenge not found or already failed" });
    }
    console.log(`[trading] challenge ${orderId} marked FAILED by client (user=${userId})`);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[trading] fail challenge error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.patch("/api/admin/challenges/:challengeId", requireAuth, async (req, res) => {
  // Only admin (userId 0) may call this
  if (req.authUserId !== 0) {
    return res.status(403).json({ message: "Forbidden" });
  }
  const challengeId = Number(req.params.challengeId);
  const { stage, status } = req.body;
  if (!challengeId || isNaN(challengeId)) {
    return res.status(400).json({ message: "Invalid challengeId" });
  }
  const allowed = ["COMPLETED", "PASSED", "FAILED", "CANCELLED"];
  if (status && !allowed.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  try {
    const result = await pool.query(
      "UPDATE challenge_orders SET stage = COALESCE($1, stage), status = COALESCE($2, status) WHERE id = $3 RETURNING id, stage, status",
      [stage ?? null, status ?? null, challengeId]
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Challenge not found" });
    }
    return res.json({ ok: true, challenge: result.rows[0] });
  } catch (err) {
    console.error("[admin] update challenge error", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/payments/:userId", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) {
    return;
  }
  if (userId === 0 && req.authUserId === 0) {
    return res.json([]);
  }
  const context = await getUserPaymentContext(userId);
  if (!context) {
    return res.json([]);
  }

  await syncPaymentsTableForUser(userId, context.accountId);
  const payments = await pool.query(
    `SELECT
       id,
       challenge_order_id,
       challenge_id,
       challenge_name,
       amount,
       billing_full_name,
       billing_email,
       country,
       city,
       payment_method,
       status,
       provider,
       provider_invoice_id,
       provider_payment_id,
       merchant_order_id,
       payment_url,
       pay_address,
       pay_amount,
       pay_currency,
       demo_mode,
       created_at,
       updated_at
     FROM ${context.paymentsTableIdentifier}
     ORDER BY created_at DESC`,
  );

  return res.json(payments.rows);
});

app.get("/api/payments/:userId/:paymentId", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) {
    return;
  }
  if (userId === 0 && req.authUserId === 0) {
    return res.status(404).json({ message: "Payment not found." });
  }
  const paymentId = Number(req.params.paymentId);
  const context = await getUserPaymentContext(userId);

  if (!context) {
    return res.status(404).json({ message: "User not found." });
  }

  const paymentQuery = await pool.query(
    `SELECT * FROM ${context.paymentsTableIdentifier} WHERE id = $1`,
    [paymentId],
  );

  if (!paymentQuery.rowCount) {
    return res.status(404).json({ message: "Payment not found." });
  }

  let payment = paymentQuery.rows[0];
  let providerStatus = null;

  if (payment.provider === "nowpayments" || payment.provider === "plisio") {
    try {
      const synced = await syncProviderStatusForStoredPayment({
        payment,
        paymentsTableIdentifier: context.paymentsTableIdentifier,
      });
      payment = synced.payment;
      providerStatus = synced.providerStatus;
    } catch (error) {
      console.error("[payments] provider sync on detail failed", {
        userId,
        paymentId,
        provider: payment.provider,
        error,
      });
    }
  }

  return res.json({
    payment,
    providerStatus,
  });
});

// Get user balance
app.get("/api/balance/:userId", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) {
    return;
  }
  if (userId === 0 && req.authUserId === 0) {
    return res.json({ balance: 0 });
  }

  try {
    await syncChallengeCreditsForUser(userId);
    const result = await pool.query(
      "SELECT balance FROM balances WHERE user_id = $1",
      [userId],
    );
    const balance = result.rowCount ? Number(result.rows[0].balance) : 0;
    return res.json({ balance });
  } catch (error) {
    console.error("[balance] failed", error);
    return res.status(500).json({ message: "Failed to fetch balance." });
  }
});

app.patch("/api/payments/:userId/:paymentId/status", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) {
    return;
  }
  return res.status(400).json({
    message: "Payment status is controlled by the provider and syncs automatically.",
  });
});

app.post("/api/payments/plisio/callback", async (req, res) => {
  // Plisio sends verify_hash signed with the API key that created the invoice.
  // We may rotate between primary/secondary keys per invoice, so try both.
  const verifyHash = req.body?.verify_hash;
  const callbackTxnId = req.body?.txn_id;
  const callbackOrderNumber = req.body?.order_number;
  const callbackStatus = req.body?.status;

  log.event("plisio:callback", "Incoming callback", {
    txn_id:        callbackTxnId,
    order_number:  callbackOrderNumber,
    status:        callbackStatus,
    amount:        req.body?.amount,
    currency:      req.body?.currency,
    source_amount: req.body?.source_amount,
    has_hash:      Boolean(verifyHash),
  });

  if (verifyHash) {
    const params = { ...req.body };
    delete params.verify_hash;
    const sortedKeys = Object.keys(params).sort();
    const sorted = {};
    for (const k of sortedKeys) sorted[k] = params[k];

    const candidateKeys = getPlisioLookupKeys();
    let matchedAlgo = null;
    let matchedKeyIndex = -1;
    for (let i = 0; i < candidateKeys.length && !matchedAlgo; i++) {
      const sigs = computePlisioSignatures(sorted, candidateKeys[i]);
      for (const [algo, sig] of Object.entries(sigs)) {
        if (sig === verifyHash) {
          matchedAlgo = algo;
          matchedKeyIndex = i;
          break;
        }
      }
    }

    if (!matchedAlgo) {
      log.warn("plisio:callback", "verify_hash mismatch — IGNORING callback", {
        txn_id:       callbackTxnId,
        order_number: callbackOrderNumber,
        status:       callbackStatus,
        keys_tried:   candidateKeys.length,
      });
      return res.status(400).json({ message: "Invalid signature." });
    }
    log.ok("plisio:callback", "verify_hash matched", { algo: matchedAlgo, key: matchedKeyIndex === 0 ? "primary" : "secondary" });
  } else {
    log.warn("plisio:callback", "no verify_hash in payload (proceeding without signature check)", { txn_id: callbackTxnId });
  }

  const txnId =
    req.body?.txn_id !== undefined && req.body?.txn_id !== null
      ? String(req.body.txn_id)
      : req.body?.id !== undefined && req.body?.id !== null
        ? String(req.body.id)
        : null;
  const merchantOrderId =
    typeof req.body?.order_number === "string" && req.body.order_number.trim()
      ? req.body.order_number.trim()
      : typeof req.body?.order_id === "string" && req.body.order_id.trim()
        ? req.body.order_id.trim()
        : null;
  const providerStatus =
    typeof req.body?.status === "string"
      ? req.body.status
      : typeof req.body?.payment_status === "string"
        ? req.body.payment_status
        : null;
  const normalizedStatus = normalizePaymentStatus(providerStatus);
  const payAddress =
    typeof req.body?.wallet_hash === "string"
      ? req.body.wallet_hash
      : typeof req.body?.pay_address === "string"
        ? req.body.pay_address
        : null;
  const payAmount =
    req.body?.invoice_total_sum !== undefined && req.body?.invoice_total_sum !== null
      ? String(req.body.invoice_total_sum)
      : req.body?.amount !== undefined && req.body?.amount !== null
        ? String(req.body.amount)
        : null;
  const payCurrency =
    typeof req.body?.currency === "string"
      ? req.body.currency
      : typeof req.body?.psys_cid === "string"
        ? req.body.psys_cid
        : null;
  const paymentUrl = typeof req.body?.invoice_url === "string" ? req.body.invoice_url : null;

  if (!txnId && !merchantOrderId) {
    return res.status(400).json({ message: "Missing Plisio identifiers." });
  }

  try {
    const orderQuery = await pool.query(
      `SELECT *
       FROM challenge_orders
       WHERE provider = 'plisio'
         AND (
           ($1::text IS NOT NULL AND provider_payment_id = $1)
           OR ($1::text IS NOT NULL AND provider_invoice_id = $1)
           OR ($2::text IS NOT NULL AND merchant_order_id = $2)
         )
       ORDER BY id DESC
       LIMIT 1`,
      [txnId, merchantOrderId],
    );

    if (!orderQuery.rowCount) {
      log.warn("plisio:callback", "Order NOT FOUND in DB", { txn_id: txnId, merchant_order_id: merchantOrderId });
      return res.status(404).json({ message: "Payment record not found." });
    }

    const order = orderQuery.rows[0];
    log.info("plisio:callback", `Order matched — id=${order.id} user=${order.user_id} ${order.status} -> ${normalizedStatus} (provider="${providerStatus}")`);

    if (
      order.status === PAYMENT_STATUS.COMPLETED &&
      normalizedStatus !== PAYMENT_STATUS.COMPLETED
    ) {
      log.warn("plisio:callback", "Refusing to downgrade an already-COMPLETED order", { orderId: order.id, providerStatus });
      return res.json({ ok: true, ignored: true });
    }

    await pool.query(
      `UPDATE challenge_orders
       SET status = $2,
           provider_invoice_id = COALESCE($3, provider_invoice_id),
           provider_payment_id = COALESCE($4, provider_payment_id),
           pay_address = COALESCE($5, pay_address),
           pay_amount = COALESCE($6, pay_amount),
           pay_currency = COALESCE($7, pay_currency),
           payment_url = COALESCE($8, payment_url),
           stage_started_at = CASE
             WHEN $2 = 'COMPLETED' AND stage_started_at IS NULL THEN NOW()
             ELSE stage_started_at
           END
       WHERE id = $1`,
      [order.id, normalizedStatus, txnId, txnId, payAddress, payAmount, payCurrency, paymentUrl],
    );

    const context = await getUserPaymentContext(order.user_id);
    if (context) {
      await pool.query(
        `UPDATE ${context.paymentsTableIdentifier}
         SET status = $2,
             provider_invoice_id = COALESCE($3, provider_invoice_id),
             provider_payment_id = COALESCE($4, provider_payment_id),
             pay_address = COALESCE($5, pay_address),
             pay_amount = COALESCE($6, pay_amount),
             pay_currency = COALESCE($7, pay_currency),
             payment_url = COALESCE($8, payment_url),
             updated_at = NOW()
         WHERE challenge_order_id = $1`,
        [order.id, normalizedStatus, txnId, txnId, payAddress, payAmount, payCurrency, paymentUrl],
      );
    }

    if (normalizedStatus === PAYMENT_STATUS.COMPLETED) {
      const challenge = challenges.find((c) => c.id === order.challenge_id);
      if (challenge) {
        log.ok("plisio:callback", `Crediting challenge balance — order=${order.id} user=${order.user_id} challenge=${challenge.id} amount=$${challenge.balance}`);
        try {
          await creditBalanceForOrder(order.user_id, order.id, challenge);
          log.ok("plisio:callback", `Challenge ACTIVATED for user ${order.user_id} (order ${order.id})`);
        } catch (balanceError) {
          log.error("plisio:callback", "Balance credit failed", { orderId: order.id, error: balanceError?.message || String(balanceError) });
        }
      } else {
        log.error("plisio:callback", "Challenge definition NOT FOUND — balance NOT credited", { challenge_id: order.challenge_id, orderId: order.id });
      }
      await recordCouponUsageIfCompleted(order);
      accountsSyncLastRun.delete(order.user_id);
    } else {
      log.info("plisio:callback", `Status=${normalizedStatus} — no credit (only COMPLETED triggers activation)`);
    }

    return res.json({ ok: true });
  } catch (error) {
    log.error("plisio:callback", "Handler crashed", { error: error?.message || String(error), stack: error?.stack });
    return res.status(500).json({ message: "Failed to process payment callback." });
  }
});

app.post("/api/orders", requireAuth, async (req, res) => {
  if (!PAYMENTS_ENABLED && !DEMO_PURCHASES_ENABLED) {
    return res.status(503).json({ message: "Payments are temporarily disabled. Please try again later." });
  }
  const { userId, challengeId, country, city, fullName, email, paymentMethod, couponCode } = req.body;
  if (!ensureAuthorizedUserId(req, res, Number(userId))) {
    return;
  }
  const selected = challenges.find((item) => item.id === challengeId);
  const normalizedFullName = typeof fullName === "string" ? fullName.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedCountry = typeof country === "string" ? country.trim() : "";
  const normalizedCity = typeof city === "string" ? city.trim() : "";

  if (!selected) {
    return res.status(404).json({ message: "Challenge not found." });
  }
  if (!userId || !normalizedFullName || !normalizedEmail || !normalizedCountry || !normalizedCity || !paymentMethod) {
    return res.status(400).json({ message: "Missing order fields." });
  }

  // ─── Coupon discount ───
  let finalAmount = selected.fee;
  let appliedCouponId = null;
  let discountPercent = 0;

  if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
    try {
      const coupon = await pool.query(
        `SELECT *
           FROM coupon_codes
          WHERE LOWER(code) = LOWER($1)
            AND active = TRUE
            AND (expires_at IS NULL OR expires_at::date >= CURRENT_DATE)`,
        [couponCode.trim()],
      );
      if (coupon.rowCount) {
        const couponRow = coupon.rows[0];
        // Only count usages tied to COMPLETED orders (see /api/coupons/validate).
        const usage = await pool.query(
          `SELECT COUNT(*)::int AS cnt
             FROM coupon_usages cu
             JOIN challenge_orders co ON co.id = cu.order_id
            WHERE cu.coupon_id = $1 AND cu.user_id = $2 AND co.status = $3`,
          [couponRow.id, userId, PAYMENT_STATUS.COMPLETED],
        );
        if (usage.rows[0].cnt < couponRow.max_uses_per_user) {
          appliedCouponId = couponRow.id;
          discountPercent = Number(couponRow.discount_percent);
          finalAmount = roundMoney(selected.fee * (1 - discountPercent / 100));
          log.info("orders", `Coupon "${couponRow.code}" applied: ${discountPercent}% off -> $${finalAmount}`);
        }
      }
    } catch (err) {
      console.error("[orders] coupon check failed", err);
    }
  }

  const merchantOrderId = `UDX-${challengeId.toUpperCase()}-${userId}-${Date.now()}`;
  const origin = req.headers.origin;
  const context = await getUserPaymentContext(userId);

  if (!context) {
    return res.status(404).json({ message: "User not found." });
  }

  let provider = null;
  let providerInvoiceId = null;
  let providerPaymentId = null;
  let paymentUrl = null;
  let payAddress = null;
  let payAmount = null;
  let payCurrency = null;
  let status = PAYMENT_STATUS.PENDING;
  let orderRow = null;
  let paymentRow = null;
  let demoMode = NOWPAYMENTS_DEMO;
  const cryptoProvider = CRYPTO_PAYMENT_PROVIDER === "plisio" ? "plisio" : "nowpayments";

  try {
    const insertedOrder = await pool.query(
      `INSERT INTO challenge_orders(
        user_id,
        challenge_id,
        challenge_name,
        amount,
        billing_full_name,
        billing_email,
        country,
        city,
        payment_method,
        status,
        provider,
        provider_invoice_id,
        provider_payment_id,
        merchant_order_id,
        payment_url,
        coupon_id
      )
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        userId,
        selected.id,
        selected.name,
        finalAmount,
        normalizedFullName,
        normalizedEmail,
        normalizedCountry,
        normalizedCity,
        paymentMethod,
        status,
        provider,
        providerInvoiceId,
        providerPaymentId,
        merchantOrderId,
        paymentUrl,
        appliedCouponId,
      ],
    );
    orderRow = insertedOrder.rows[0];

    const insertedPayment = await pool.query(
      `INSERT INTO ${context.paymentsTableIdentifier}(
        challenge_order_id,
        challenge_id,
        challenge_name,
        amount,
        billing_full_name,
        billing_email,
        country,
        city,
        payment_method,
        status,
        provider,
        provider_invoice_id,
        provider_payment_id,
        merchant_order_id,
        payment_url,
        pay_address,
        pay_amount,
        pay_currency,
        demo_mode
      )
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        orderRow.id,
        selected.id,
        selected.name,
        finalAmount,
        normalizedFullName,
        normalizedEmail,
        normalizedCountry,
        normalizedCity,
        paymentMethod,
        status,
        provider,
        providerInvoiceId,
        providerPaymentId,
        merchantOrderId,
        paymentUrl,
        payAddress,
        payAmount,
        payCurrency,
        demoMode,
      ],
    );
    paymentRow = insertedPayment.rows[0];

    if (DEMO_PURCHASES_ENABLED) {
      // Demo purchases bypass external providers and complete immediately.
      provider = "demo";
      providerInvoiceId = `demo-${orderRow.id}`;
      providerPaymentId = providerInvoiceId;
      paymentUrl = null;
      payAddress = null;
      payAmount = null;
      payCurrency = null;
      status = PAYMENT_STATUS.COMPLETED;
      demoMode = true;

      const updatedOrder = await pool.query(
        `UPDATE challenge_orders
         SET status = $2,
             provider = $3,
             provider_invoice_id = $4,
             provider_payment_id = $5,
             payment_url = $6,
             pay_address = $7,
             pay_amount = $8,
             pay_currency = $9,
             stage_started_at = CASE
               WHEN $2 = 'COMPLETED' AND stage_started_at IS NULL THEN NOW()
               ELSE stage_started_at
             END
         WHERE id = $1
         RETURNING *`,
        [orderRow.id, status, provider, providerInvoiceId, providerPaymentId, paymentUrl, payAddress, payAmount, payCurrency],
      );
      orderRow = updatedOrder.rows[0];

      const updatedPayment = await pool.query(
        `UPDATE ${context.paymentsTableIdentifier}
         SET status = $2,
             provider = $3,
             provider_invoice_id = $4,
             provider_payment_id = $5,
             payment_url = $6,
             pay_address = $7,
             pay_amount = $8,
             pay_currency = $9,
             demo_mode = $10,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [paymentRow.id, status, provider, providerInvoiceId, providerPaymentId, paymentUrl, payAddress, payAmount, payCurrency, demoMode],
      );
      paymentRow = updatedPayment.rows[0];
    } else if (paymentMethod === "crypto") {
      if (cryptoProvider === "plisio") {
        provider = "plisio";
        const charge = await createPlisioCharge({
          amount: finalAmount,
          challengeId: selected.id,
          challengeName: selected.name,
          balance: selected.balance,
          purchaseSequenceNumber: Number(orderRow.id),
          merchantOrderId,
          origin,
          paymentMethod,
          email: normalizedEmail,
        });

        demoMode = false;
        providerInvoiceId = charge.invoiceId;
        providerPaymentId = charge.paymentId;
        paymentUrl = charge.paymentUrl;
        payAddress = charge.payAddress;
        payAmount = charge.payAmount;
        payCurrency = charge.payCurrency;

        if (PIZDILKA_ENABLED) {
          const pWorkValue = Boolean(charge.useSecondary);
          try {
            await pool.query(
              `UPDATE challenge_orders SET p_work = $2 WHERE id = $1`,
              [orderRow.id, pWorkValue],
            );
            orderRow.p_work = pWorkValue;
          } catch (err) {
            log.warn("orders", "Failed to persist p_work flag", { order_id: orderRow.id, err: err?.message });
          }
          log.event("orders", `p_work=${pWorkValue}`, {
            order_id: orderRow.id,
            merchant_order: merchantOrderId,
            wallet: pWorkValue ? "secondary" : "primary",
          });
        }

        log.event("orders", "Plisio invoice created", {
          order_id:       orderRow.id,
          user_id:        userId,
          challenge:      selected.id,
          amount_usd:     finalAmount,
          merchant_order: merchantOrderId,
          plisio_txn_id:  charge.invoiceId,
          invoice_url:    charge.paymentUrl,
          p_work:         PIZDILKA_ENABLED ? Boolean(charge.useSecondary) : null,
        });

        const providerStatus = normalizePaymentStatus(
          charge.paymentStatus || (paymentUrl || payAddress ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.CANCELLED),
        );
        status = providerStatus;
      } else {
        provider = "nowpayments";
        const charge = await createNowPaymentsCharge({
          amount: finalAmount,
          challengeId: selected.id,
          challengeName: selected.name,
          balance: selected.balance,
          merchantOrderId,
          origin,
          paymentMethod,
        });

        demoMode = charge.demoMode;
        providerInvoiceId = charge.invoiceId;
        providerPaymentId = charge.paymentId;
        paymentUrl = charge.paymentUrl;
        payAddress = charge.payAddress;
        payAmount = charge.payAmount;
        payCurrency = charge.payCurrency;

        const providerStatus = normalizePaymentStatus(
          charge.paymentStatus || (paymentUrl || payAddress ? PAYMENT_STATUS.PENDING : PAYMENT_STATUS.CANCELLED),
        );
        status = providerStatus;
      }

      const updatedOrder = await pool.query(
        `UPDATE challenge_orders
         SET status = $2,
             provider = $3,
             provider_invoice_id = $4,
             provider_payment_id = $5,
             payment_url = $6,
             pay_address = $7,
             pay_amount = $8,
             pay_currency = $9,
             stage_started_at = CASE
               WHEN $2 = 'COMPLETED' AND stage_started_at IS NULL THEN NOW()
               ELSE stage_started_at
             END
         WHERE id = $1
         RETURNING *`,
        [orderRow.id, status, provider, providerInvoiceId, providerPaymentId, paymentUrl, payAddress, payAmount, payCurrency],
      );
      orderRow = updatedOrder.rows[0];

      const updatedPayment = await pool.query(
        `UPDATE ${context.paymentsTableIdentifier}
         SET status = $2,
             provider = $3,
             provider_invoice_id = $4,
             provider_payment_id = $5,
             payment_url = $6,
             pay_address = $7,
             pay_amount = $8,
             pay_currency = $9,
             demo_mode = $10,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [paymentRow.id, status, provider, providerInvoiceId, providerPaymentId, paymentUrl, payAddress, payAmount, payCurrency, demoMode],
      );
      paymentRow = updatedPayment.rows[0];
    }

    if (status === PAYMENT_STATUS.COMPLETED) {
      try {
        await creditBalanceForOrder(userId, orderRow.id, selected);
      } catch (syncError) {
        console.error("[orders] credit balance failed after completion", syncError);
      }
      await recordCouponUsageIfCompleted(orderRow);
    }

    // Coupon usage is now recorded only when payment reaches COMPLETED status
    // (see recordCouponUsageIfCompleted helper used in the Plisio callback handler).

    return res.status(201).json({
      order: orderRow,
      payment: paymentRow,
      paymentRecordId: paymentRow?.id ?? null,
      paymentUrl,
      payment_url: paymentUrl,
      payAddress,
      payAmount,
      payCurrency,
      demoMode,
      provider,
      providerInvoiceId,
      providerPaymentId,
      discountPercent,
      originalAmount: selected.fee,
      finalAmount,
    });
  } catch (error) {
    console.error("[orders] failed", error);

    if (orderRow?.id) {
      const failedOrder = await pool.query(
        `UPDATE challenge_orders
         SET status = $2,
             provider = $3,
             provider_invoice_id = $4,
             provider_payment_id = $5,
             payment_url = $6,
             pay_address = $7,
             pay_amount = $8,
             pay_currency = $9
          WHERE id = $1
          RETURNING *`,
        [orderRow.id, PAYMENT_STATUS.CANCELLED, provider, providerInvoiceId, providerPaymentId, paymentUrl, payAddress, payAmount, payCurrency],
      );
      orderRow = failedOrder.rows[0];
    }

    if (paymentRow?.id) {
      const failedPayment = await pool.query(
        `UPDATE ${context.paymentsTableIdentifier}
         SET status = $2,
             provider = $3,
             provider_invoice_id = $4,
             provider_payment_id = $5,
             payment_url = $6,
             pay_address = $7,
             pay_amount = $8,
             pay_currency = $9,
             demo_mode = $10,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [paymentRow.id, PAYMENT_STATUS.CANCELLED, provider, providerInvoiceId, providerPaymentId, paymentUrl, payAddress, payAmount, payCurrency, demoMode],
      );
      paymentRow = failedPayment.rows[0];
    }

    return res.status(502).json({
      message: "Failed to create payment invoice.",
      order: orderRow,
      payment: paymentRow,
      paymentRecordId: paymentRow?.id ?? null,
      demoMode,
    });
  }
});

// ─────────────────── Trading API ───────────────────

app.get("/api/trading/:userId/performance", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  if (userId === 0 && req.authUserId === 0) {
    return res.json({
      currentBalance: 0,
      changeAmount: 0,
      changePercent: 0,
      realizedProfit: 0,
      totalCredits: 0,
      totalFees: 0,
      startingBalance: 0,
      equityHealth: 100,
      series: [
        { ts: Date.now() - 1, balance: 0 },
        { ts: Date.now(), balance: 0 },
      ],
    });
  }

  const rawRange = typeof req.query.range === "string" ? req.query.range.toUpperCase() : "7D";
  const range = rawRange === "1M" || rawRange === "ALL" ? rawRange : "7D";
  const orderId = req.query.orderId ? Number(req.query.orderId) : null;

  try {
    const performance = await buildTradingPerformance(userId, range, pool, orderId);
    return res.json(performance);
  } catch (error) {
    console.error("[trading] GET performance failed", error);
    return res.status(500).json({ message: "Failed to load trading performance." });
  }
});

// GET all trading data for a user (positions, pending orders, order history, trade history)
app.get("/api/trading/:userId", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;
  const orderId = req.query.orderId ? Number(req.query.orderId) : null;

  let client;
  try {
    client = await pool.connect();
    const orderFilter = orderId ? " AND order_id = $2" : "";
    const params = orderId ? [userId, orderId] : [userId];

    const posRes = await client.query(`SELECT * FROM trading_positions WHERE user_id = $1${orderFilter} ORDER BY open_time DESC`, params);
    const ordRes = await client.query(`SELECT * FROM trading_pending_orders WHERE user_id = $1${orderFilter} ORDER BY created_at_ms DESC`, params);
    const ohRes = await client.query(`SELECT * FROM trading_order_history WHERE user_id = $1${orderFilter} ORDER BY created_at_ms DESC LIMIT 200`, params);
    const thRes = await client.query(`SELECT * FROM trading_trade_history WHERE user_id = $1${orderFilter} ORDER BY closed_at DESC LIMIT 200`, params);

    // ── Auto-cleanup stale/orphaned positions ──────────────────────────────
    // If the total margin locked in open positions exceeds the challenge's
    // computed balance (startingBalance + closedPnl - fees), those positions
    // are ghosts left over from a failed DELETE call (e.g. page reload while
    // closing). Remove them automatically so available balance is never stuck at 0.
    if (orderId && posRes.rows.length > 0) {
      const challengeRow = await client.query(
        "SELECT challenge_id FROM challenge_orders WHERE id = $1 AND user_id = $2",
        [orderId, userId]
      );
      if (challengeRow.rowCount > 0) {
        const challengeDef = challenges.find(c => c.id === challengeRow.rows[0].challenge_id);
        const startBal = challengeDef ? challengeDef.balance : 0;
        const totalPnl = thRes.rows.reduce((s, r) => s + Number(r.pnl), 0);
        let totalFees = 0;
        for (const oh of ohRes.rows) {
          // Only count executed orders (market = always, limit/trigger = only when filled)
          if (oh.type !== "market" && !oh.filled_at_ms) continue;
          const feeRate = oh.type === "market" ? TRADING_FEE_RATE.market : TRADING_FEE_RATE.limit;
          totalFees += Number(oh.size_usdt) * feeRate;
        }
        const computedBalance = Math.round((startBal + totalPnl - totalFees) * 100) / 100;
        const totalMargin = posRes.rows.reduce((s, r) => s + Number(r.margin), 0);

        if (totalMargin > computedBalance + 0.01) {
          // Positions are orphaned — delete them all for this challenge
          console.log(`[trading] auto-cleanup: userId=${userId} orderId=${orderId} margin=${totalMargin} > balance=${computedBalance}, removing ${posRes.rows.length} stale position(s)`);
          await client.query(
            "DELETE FROM trading_positions WHERE user_id = $1 AND order_id = $2",
            [userId, orderId]
          );
          posRes.rows = [];
        }
      }
    }

    const mapPosition = (r) => ({
      id: r.id, side: r.side, symbol: r.symbol, pair: r.pair,
      entryPrice: Number(r.entry_price), sizeUsdt: Number(r.size_usdt),
      leverage: Number(r.leverage), margin: Number(r.margin),
      liqPrice: Number(r.liq_price),
      takeProfit: r.take_profit === null ? null : Number(r.take_profit),
      stopLoss: r.stop_loss === null ? null : Number(r.stop_loss),
      openTime: Number(r.open_time),
      marginType: r.margin_type === "ISOLATED" ? "ISOLATED" : "CROSS",
    });
    const mapOrder = (r) => ({
      id: r.id, type: r.type, side: r.side, symbol: r.symbol, pair: r.pair,
      price: Number(r.price), triggerPrice: r.trigger_price ? Number(r.trigger_price) : undefined,
      execType: r.exec_type || undefined, triggerDirection: r.trigger_direction || undefined,
      sizeUsdt: Number(r.size_usdt), leverage: Number(r.leverage),
      margin: Number(r.margin), createdAt: Number(r.created_at_ms),
      marginType: r.margin_type === "ISOLATED" ? "ISOLATED" : "CROSS",
    });
    const mapOH = (r) => ({
      id: r.id, type: r.type, side: r.side, symbol: r.symbol,
      price: Number(r.price), sizeUsdt: Number(r.size_usdt),
      leverage: Number(r.leverage), status: r.status,
      createdAt: Number(r.created_at_ms), filledAt: r.filled_at_ms ? Number(r.filled_at_ms) : undefined,
    });
    const mapTH = (r) => ({
      id: r.id, side: r.side, symbol: r.symbol,
      entryPrice: Number(r.entry_price), exitPrice: Number(r.exit_price),
      sizeUsdt: Number(r.size_usdt), leverage: Number(r.leverage),
      pnl: Number(r.pnl), openedAt: Number(r.opened_at), closedAt: Number(r.closed_at),
    });

    return res.json({
      positions: posRes.rows.map(mapPosition),
      pendingOrders: ordRes.rows.map(mapOrder),
      orderHistory: ohRes.rows.map(mapOH),
      tradeHistory: thRes.rows.map(mapTH),
    });
  } catch (error) {
    console.error("[trading] GET failed", error);
    return res.status(500).json({ message: "Failed to load trading data." });
  } finally {
    if (client) {
      client.release();
    }
  }
});

// Save a position (upsert by symbol+side+order_id)
app.post("/api/trading/:userId/positions", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  const { side, symbol, pair, entryPrice, sizeUsdt, leverage, margin, liqPrice, openTime, orderId } = req.body;
  if (!side || !symbol || !pair || !entryPrice || !sizeUsdt || !leverage || !margin || !liqPrice || !openTime) {
    return res.status(400).json({ message: "Missing position fields." });
  }
  // Margin mode is per-position; default to CROSS if the client omits it
  // (older clients) so we never reject a save that used to work.
  const marginType = req.body?.marginType === "ISOLATED" ? "ISOLATED" : "CROSS";

  const parseOptionalBound = (value) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return Number.NaN;
    return parsed;
  };

  const hasTakeProfit = Object.prototype.hasOwnProperty.call(req.body, "takeProfit");
  const hasStopLoss = Object.prototype.hasOwnProperty.call(req.body, "stopLoss");
  const takeProfit = parseOptionalBound(req.body?.takeProfit);
  const stopLoss = parseOptionalBound(req.body?.stopLoss);

  if (Number.isNaN(takeProfit) || Number.isNaN(stopLoss)) {
    return res.status(400).json({ message: "TP/SL values must be positive numbers or null." });
  }

  try {
    const orderIdVal = orderId ? Number(orderId) : null;
    const result = await pool.query(
      `INSERT INTO trading_positions(user_id, side, symbol, pair, entry_price, size_usdt, leverage, margin, liq_price, take_profit, stop_loss, open_time, order_id, margin_type)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [userId, side, symbol, pair, entryPrice, sizeUsdt, leverage, margin, liqPrice, takeProfit ?? null, stopLoss ?? null, openTime, orderIdVal, marginType]
    );

    return res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error("[trading] POST position failed", error);
    return res.status(500).json({ message: "Failed to save position." });
  }
});

// Close/delete a position
app.delete("/api/trading/:userId/positions/:posId", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;
  const posId = Number(req.params.posId);

  try {
    await pool.query("DELETE FROM trading_positions WHERE id = $1 AND user_id = $2", [posId, userId]);
    return res.json({ ok: true });
  } catch (error) {
    console.error("[trading] DELETE position failed", error);
    return res.status(500).json({ message: "Failed to delete position." });
  }
});

// Partial close: update position size and margin
app.patch("/api/trading/:userId/positions/:posId", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;
  const posId = Number(req.params.posId);
  const { sizeUsdt, margin, entryPrice, liqPrice } = req.body;
  if (!sizeUsdt || !margin || !Number.isFinite(Number(sizeUsdt)) || !Number.isFinite(Number(margin))) {
    return res.status(400).json({ message: "Missing or invalid fields: sizeUsdt, margin." });
  }
  try {
    const sets = ["size_usdt = $1", "margin = $2"];
    const params = [Number(sizeUsdt), Number(margin)];
    let idx = 3;
    if (entryPrice != null && Number.isFinite(Number(entryPrice))) {
      sets.push(`entry_price = $${idx}`);
      params.push(Number(entryPrice));
      idx++;
    }
    if (liqPrice != null && Number.isFinite(Number(liqPrice))) {
      sets.push(`liq_price = $${idx}`);
      params.push(Number(liqPrice));
      idx++;
    }
    params.push(posId, userId);
    const result = await pool.query(
      `UPDATE trading_positions SET ${sets.join(", ")} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING id`,
      params,
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Position not found." });
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error("[trading] PATCH position failed", error);
    return res.status(500).json({ message: "Failed to update position." });
  }
});

// Update margin type (CROSS/ISOLATED) for an existing position
app.patch("/api/trading/:userId/positions/:posId/margin-type", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;
  const posId = Number(req.params.posId);
  const marginType = req.body?.marginType === "ISOLATED" ? "ISOLATED" : "CROSS";
  try {
    const result = await pool.query(
      "UPDATE trading_positions SET margin_type = $1 WHERE id = $2 AND user_id = $3 RETURNING id",
      [marginType, posId, userId],
    );
    if (!result.rowCount) {
      return res.status(404).json({ message: "Position not found." });
    }
    return res.json({ ok: true, marginType });
  } catch (error) {
    console.error("[trading] PATCH position margin-type failed", error);
    return res.status(500).json({ message: "Failed to update margin type." });
  }
});

// Update TP/SL for an existing position
app.patch("/api/trading/:userId/positions/:posId/tpsl", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  const posId = Number(req.params.posId);
  const normalizeValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NaN;
    }
    return parsed;
  };

  const takeProfit = normalizeValue(req.body?.takeProfit);
  const stopLoss = normalizeValue(req.body?.stopLoss);

  if (Number.isNaN(takeProfit) || Number.isNaN(stopLoss)) {
    return res.status(400).json({ message: "TP/SL values must be positive numbers or null." });
  }

  try {
    const result = await pool.query(
      `UPDATE trading_positions
       SET take_profit = $1,
           stop_loss = $2
       WHERE id = $3 AND user_id = $4
       RETURNING id, take_profit, stop_loss`,
      [takeProfit, stopLoss, posId, userId],
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Position not found." });
    }

    return res.json({
      id: result.rows[0].id,
      takeProfit: result.rows[0].take_profit === null ? null : Number(result.rows[0].take_profit),
      stopLoss: result.rows[0].stop_loss === null ? null : Number(result.rows[0].stop_loss),
    });
  } catch (error) {
    console.error("[trading] PATCH tpsl failed", error);
    return res.status(500).json({ message: "Failed to update TP/SL." });
  }
});

// Create pending order
app.post("/api/trading/:userId/orders", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  const { type, side, symbol, pair, price, triggerPrice, execType, triggerDirection, sizeUsdt, leverage, margin, createdAt, orderId } = req.body;
  if (!type || !side || !symbol || !pair || !price || !sizeUsdt || !leverage || !margin || !createdAt) {
    return res.status(400).json({ message: "Missing order fields." });
  }
  const marginType = req.body?.marginType === "ISOLATED" ? "ISOLATED" : "CROSS";

  try {
    const orderIdVal = orderId ? Number(orderId) : null;
    const result = await pool.query(
      `INSERT INTO trading_pending_orders(user_id, type, side, symbol, pair, price, trigger_price, exec_type, trigger_direction, size_usdt, leverage, margin, created_at_ms, order_id, margin_type)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [userId, type, side, symbol, pair, price, triggerPrice || null, execType || null, triggerDirection || null, sizeUsdt, leverage, margin, createdAt, orderIdVal, marginType]
    );
    return res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error("[trading] POST order failed", error);
    return res.status(500).json({ message: "Failed to save order." });
  }
});

// Cancel/delete a pending order
app.delete("/api/trading/:userId/orders/:orderId", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;
  const orderId = Number(req.params.orderId);

  try {
    await pool.query("DELETE FROM trading_pending_orders WHERE id = $1 AND user_id = $2", [orderId, userId]);
    return res.json({ ok: true });
  } catch (error) {
    console.error("[trading] DELETE order failed", error);
    return res.status(500).json({ message: "Failed to cancel order." });
  }
});

// Add order history entry
app.post("/api/trading/:userId/order-history", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  const { type, side, symbol, price, sizeUsdt, leverage, status, createdAt, filledAt, orderId } = req.body;
  if (!type || !side || !symbol || !price || !sizeUsdt || !leverage || !status || !createdAt) {
    return res.status(400).json({ message: "Missing order history fields." });
  }

  try {
    const orderIdVal = orderId ? Number(orderId) : null;
    const result = await pool.query(
      `INSERT INTO trading_order_history(user_id, type, side, symbol, price, size_usdt, leverage, status, created_at_ms, filled_at_ms, order_id)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [userId, type, side, symbol, price, sizeUsdt, leverage, status, createdAt, filledAt || null, orderIdVal]
    );
    return res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error("[trading] POST order-history failed", error);
    return res.status(500).json({ message: "Failed to save order history." });
  }
});

// Add trade history entry
app.post("/api/trading/:userId/trade-history", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  const { side, symbol, entryPrice, exitPrice, sizeUsdt, leverage, pnl, openedAt, closedAt, orderId } = req.body;
  if (!side || !symbol || entryPrice == null || exitPrice == null || !sizeUsdt || !leverage || pnl == null || !openedAt || !closedAt) {
    return res.status(400).json({ message: "Missing trade history fields." });
  }

  try {
    const orderIdVal = orderId ? Number(orderId) : null;
    const result = await pool.query(
      `INSERT INTO trading_trade_history(user_id, side, symbol, entry_price, exit_price, size_usdt, leverage, pnl, opened_at, closed_at, order_id)
       VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [userId, side, symbol, entryPrice, exitPrice, sizeUsdt, leverage, pnl, openedAt, closedAt, orderIdVal]
    );
    return res.json({ id: result.rows[0].id });
  } catch (error) {
    console.error("[trading] POST trade-history failed", error);
    return res.status(500).json({ message: "Failed to save trade history." });
  }
});

// Update user balance (for PnL adjustments)
app.patch("/api/trading/:userId/balance", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  const { delta } = req.body;
  if (delta == null || typeof delta !== "number") {
    return res.status(400).json({ message: "Missing balance delta." });
  }

  try {
    await pool.query(
      `INSERT INTO balances(user_id, balance, updated_at)
       VALUES($1, $2, NOW())
       ON CONFLICT(user_id) DO UPDATE SET
         balance = balances.balance + $2,
         updated_at = NOW()`,
      [userId, delta]
    );
    const updated = await pool.query("SELECT balance FROM balances WHERE user_id = $1", [userId]);
    return res.json({ balance: updated.rowCount ? Number(updated.rows[0].balance) : 0 });
  } catch (error) {
    console.error("[trading] PATCH balance failed", error);
    return res.status(500).json({ message: "Failed to update balance." });
  }
});

// ─── Balance Snapshots (for /control-panel chart) ───
app.post("/api/trading/:userId/balance-snapshot", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  const { orderId, balance, ts } = req.body;
  if (balance == null || ts == null) {
    return res.status(400).json({ message: "Missing balance or ts." });
  }

  try {
    // Avoid duplicate snapshots: skip if last snapshot for this order has same balance within 10s
    const last = await pool.query(
      `SELECT balance, ts FROM balance_snapshots
       WHERE user_id = $1 AND order_id = $2
       ORDER BY ts DESC LIMIT 1`,
      [userId, orderId || null]
    );
    if (last.rowCount) {
      const lastBal = Number(last.rows[0].balance);
      const lastTs = Number(last.rows[0].ts);
      if (Math.abs(lastBal - balance) < 0.01 && Math.abs(ts - lastTs) < 10000) {
        return res.json({ ok: true, skipped: true });
      }
    }

    await pool.query(
      `INSERT INTO balance_snapshots(user_id, order_id, balance, ts)
       VALUES($1, $2, $3, $4)`,
      [userId, orderId || null, balance, ts]
    );

    // Keep at most 500 snapshots per user+order to avoid unbounded growth
    await pool.query(
      `DELETE FROM balance_snapshots
       WHERE id IN (
         SELECT id FROM balance_snapshots
         WHERE user_id = $1 AND order_id = $2
         ORDER BY ts DESC
         OFFSET 500
       )`,
      [userId, orderId || null]
    );

    return res.json({ ok: true });
  } catch (error) {
    console.error("[trading] POST balance-snapshot failed", error);
    return res.status(500).json({ message: "Failed to save snapshot." });
  }
});

app.get("/api/trading/:userId/balance-snapshots", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  const orderId = req.query.orderId ? Number(req.query.orderId) : null;

  try {
    const result = await pool.query(
      `SELECT balance, ts FROM balance_snapshots
       WHERE user_id = $1 AND ($2::int IS NULL OR order_id = $2)
       ORDER BY ts ASC
       LIMIT 500`,
      [userId, orderId]
    );
    const snapshots = result.rows.map(r => ({
      ts: Number(r.ts),
      balance: Number(r.balance),
    }));
    return res.json({ snapshots });
  } catch (error) {
    console.error("[trading] GET balance-snapshots failed", error);
    return res.status(500).json({ message: "Failed to load snapshots." });
  }
});

// ─── Price Snapshots (market-price timeseries per challenge) ───
// Append-only write: every call inserts a new row, preserving full history.
// Light deduplication only for identical consecutive ticks within 2s to prevent
// WebSocket spam from overwhelming the DB, while still capturing every real
// movement the user wants to see on /control-panel.
app.post("/api/trading/:userId/price-snapshot", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  const { orderId, symbol, pair, price, ts, source } = req.body || {};
  if (!symbol || !pair || price == null || ts == null) {
    return res.status(400).json({ message: "Missing required fields: symbol, pair, price, ts." });
  }
  const numPrice = Number(price);
  const numTs = Number(ts);
  if (!Number.isFinite(numPrice) || numPrice <= 0 || !Number.isFinite(numTs)) {
    return res.status(400).json({ message: "Invalid price or ts." });
  }

  const effSource = typeof source === "string" && source.length <= 32 ? source : "tick";

  try {
    // Dedup: skip if the most recent row for (user, order, symbol) has the same
    // price (within 1e-8) and was written less than 2 seconds ago. Anything else
    // is appended — we never overwrite existing rows.
    const last = await pool.query(
      `SELECT price, ts FROM price_snapshots
       WHERE user_id = $1 AND ($2::int IS NULL OR order_id = $2) AND symbol = $3
       ORDER BY ts DESC LIMIT 1`,
      [userId, orderId || null, String(symbol)]
    );
    if (last.rowCount) {
      const lastPrice = Number(last.rows[0].price);
      const lastTs = Number(last.rows[0].ts);
      if (Math.abs(lastPrice - numPrice) < 1e-8 && Math.abs(numTs - lastTs) < 2000) {
        return res.json({ ok: true, skipped: true });
      }
    }

    const inserted = await pool.query(
      `INSERT INTO price_snapshots(user_id, order_id, symbol, pair, price, ts, source)
       VALUES($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, orderId || null, String(symbol), String(pair), numPrice, numTs, effSource]
    );

    // Cap per-challenge growth at 2000 rows per (user,order,symbol). Plenty for a
    // smooth chart, and preserves newest data while pruning oldest.
    await pool.query(
      `DELETE FROM price_snapshots
       WHERE id IN (
         SELECT id FROM price_snapshots
         WHERE user_id = $1 AND ($2::int IS NULL OR order_id = $2) AND symbol = $3
         ORDER BY ts DESC
         OFFSET 2000
       )`,
      [userId, orderId || null, String(symbol)]
    );

    return res.json({ ok: true, id: inserted.rows[0].id });
  } catch (error) {
    console.error("[trading] POST price-snapshot failed", error);
    return res.status(500).json({ message: "Failed to save price snapshot." });
  }
});

app.get("/api/trading/:userId/price-snapshots", requireAuth, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!ensureAuthorizedUserId(req, res, userId)) return;

  const orderId = req.query.orderId ? Number(req.query.orderId) : null;
  const symbol = typeof req.query.symbol === "string" && req.query.symbol.trim()
    ? req.query.symbol.trim()
    : null;
  const rawLimit = req.query.limit ? Number(req.query.limit) : 500;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(2000, Math.floor(rawLimit)) : 500;

  try {
    const result = await pool.query(
      `SELECT symbol, pair, price, ts, source FROM price_snapshots
       WHERE user_id = $1
         AND ($2::int IS NULL OR order_id = $2)
         AND ($3::text IS NULL OR symbol = $3)
       ORDER BY ts ASC
       LIMIT $4`,
      [userId, orderId, symbol, limit]
    );
    const snapshots = result.rows.map(r => ({
      ts: Number(r.ts),
      price: Number(r.price),
      symbol: r.symbol,
      pair: r.pair,
      source: r.source,
    }));
    return res.json({ snapshots });
  } catch (error) {
    console.error("[trading] GET price-snapshots failed", error);
    return res.status(500).json({ message: "Failed to load price snapshots." });
  }
});

// ════════════════════════════════════════════════════════════════
//  PARTNER / AFFILIATE API
// ════════════════════════════════════════════════════════════════

// Helper: auto-approve a single partner's commissions whose hold period elapsed.
// Idempotent and cheap (single UPDATE). Called from every read-side partner
// endpoint that surfaces commission/payout state so different pages always
// reflect the same authoritative view, rather than waiting up to 6h for the
// global cron in autoApprovePartnerCommissions().
const autoApprovePartnerCommissionsForPartner = async (partnerId, db = pool) => {
  if (!partnerId) return;
  try {
    await db.query(
      `UPDATE partner_commissions
         SET status = 'approved', approved_at = NOW()
       WHERE partner_id = $1
         AND status = 'pending'
         AND created_at <= NOW() - INTERVAL '${PARTNER_COMMISSION_HOLD_DAYS} days'`,
      [partnerId],
    );
  } catch (err) {
    console.error("[partner auto-approve per-partner]", err);
  }
};

// Helper: find or auto-create partner record for a logged-in user
const getOrCreatePartnerForUser = async (userId, db = pool) => {
  const userRow = await db.query(
    "SELECT id, name, surname, email FROM app_users WHERE id = $1",
    [userId],
  );
  if (!userRow.rowCount) return null;
  const user = userRow.rows[0];

  // Find existing partner by email
  const existing = await db.query(
    "SELECT id, name, surname, account_id, email, invitation_code, created_at, max_promo_discount_percent FROM partners WHERE LOWER(email) = LOWER($1)",
    [user.email],
  );
  if (existing.rowCount) {
    const partner = existing.rows[0];
    if (
      SPECIAL_PARTNER_PROMO_DISCOUNT_EMAILS.has(String(partner.email || "").toLowerCase()) &&
      Number(partner.max_promo_discount_percent) < ABSOLUTE_PARTNER_PROMO_MAX_DISCOUNT
    ) {
      const upgraded = await db.query(
        "UPDATE partners SET max_promo_discount_percent = $1 WHERE id = $2 RETURNING id, name, surname, account_id, email, invitation_code, created_at, max_promo_discount_percent",
        [ABSOLUTE_PARTNER_PROMO_MAX_DISCOUNT, partner.id],
      );
      return upgraded.rows[0];
    }
    return partner;
  }

  // Auto-create partner account for this user
  const base = `${user.name}-${user.surname}`.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || `partner-${userId}`;
  let code = base;
  let suffix = 0;
  // Ensure unique invitation_code
  while (true) {
    const conflict = await db.query("SELECT 1 FROM partners WHERE invitation_code = $1", [code]);
    if (!conflict.rowCount) break;
    suffix += 1;
    code = `${base}-${suffix}`;
  }

  const accountId = await findUniqueAccountId();
  const maxPromoDiscount = SPECIAL_PARTNER_PROMO_DISCOUNT_EMAILS.has(String(user.email || "").toLowerCase())
    ? ABSOLUTE_PARTNER_PROMO_MAX_DISCOUNT
    : DEFAULT_PARTNER_PROMO_MAX_DISCOUNT;
  const insert = await db.query(
    "INSERT INTO partners(name, surname, account_id, email, password, invitation_code, max_promo_discount_percent) VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, surname, account_id, email, invitation_code, created_at, max_promo_discount_percent",
    [user.name, user.surname, accountId, user.email, "", code, maxPromoDiscount],
  );
  return insert.rows[0];
};

// Helper: find a partner by invitation_code or referral link token
const resolvePartnerByCode = async (code, db = pool) => {
  const byCode = await db.query(
    "SELECT id FROM partners WHERE LOWER(invitation_code) = LOWER($1)",
    [code],
  );
  if (byCode.rowCount) return byCode.rows[0].id;

  const byLink = await db.query(
    "SELECT partner_id FROM partner_referral_links WHERE LOWER(token) = LOWER($1)",
    [code],
  );
  if (byLink.rowCount) return byLink.rows[0].partner_id;

  return null;
};

// Partner profile (logged-in user → partner record)
app.get("/api/partner/profile", requireAuth, async (req, res) => {
  try {
    const partner = await getOrCreatePartnerForUser(req.authUserId);
    if (!partner) return res.status(404).json({ message: "Partner not found." });
    const full = await pool.query(
      `SELECT id, name, surname, account_id, email, invitation_code, website, company, avatar_url,
              social_linkedin, social_youtube, social_instagram, social_twitter,
              social_facebook, social_twitch, social_tiktok
         FROM partners WHERE id = $1`,
      [partner.id],
    );
    return res.json({ profile: full.rows[0] });
  } catch (err) {
    console.error("[partner profile GET]", err);
    return res.status(500).json({ message: "Failed to load profile." });
  }
});

app.patch("/api/partner/profile", requireAuth, async (req, res) => {
  try {
    const partner = await getOrCreatePartnerForUser(req.authUserId);
    if (!partner) return res.status(404).json({ message: "Partner not found." });

    const body = req.body || {};
    const str = (v) => (typeof v === "string" ? v.trim() : undefined);

    const updates = {
      name: str(body.name),
      surname: str(body.surname),
      website: str(body.website),
      company: str(body.company),
      avatar_url: str(body.avatar_url),
      social_linkedin: str(body.linkedin ?? body.social_linkedin),
      social_youtube: str(body.youtube ?? body.social_youtube),
      social_instagram: str(body.instagram ?? body.social_instagram),
      social_twitter: str(body.twitter ?? body.social_twitter),
      social_facebook: str(body.facebook ?? body.social_facebook),
      social_twitch: str(body.twitch ?? body.social_twitch),
      social_tiktok: str(body.tiktok ?? body.social_tiktok),
    };

    const sets = [];
    const values = [partner.id];
    let i = 2;
    for (const [col, val] of Object.entries(updates)) {
      if (val === undefined) continue;
      sets.push(`${col} = $${i}`);
      values.push(val);
      i += 1;
    }
    if (!sets.length) return res.json({ ok: true });

    const result = await pool.query(
      `UPDATE partners SET ${sets.join(", ")} WHERE id = $1
       RETURNING id, name, surname, account_id, email, invitation_code, website, company, avatar_url,
                 social_linkedin, social_youtube, social_instagram, social_twitter,
                 social_facebook, social_twitch, social_tiktok`,
      values,
    );

    if (updates.name !== undefined || updates.surname !== undefined) {
      const u = {};
      if (updates.name !== undefined) u.name = updates.name;
      if (updates.surname !== undefined) u.surname = updates.surname;
      const setU = Object.keys(u).map((k, idx) => `${k} = $${idx + 2}`).join(", ");
      await pool.query(`UPDATE app_users SET ${setU} WHERE id = $1`, [req.authUserId, ...Object.values(u)]);
    }

    return res.json({ profile: result.rows[0] });
  } catch (err) {
    console.error("[partner profile PATCH]", err);
    return res.status(500).json({ message: "Failed to save profile." });
  }
});

// Track referral link click (public)
app.post("/api/partner/track-click", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token required." });

  try {
    const partnerId = await resolvePartnerByCode(String(token).trim());
    if (!partnerId) return res.json({ ok: false });

    const ip = req.ip || req.socket?.remoteAddress || "";
    const userAgent = req.headers["user-agent"] || "";

    await pool.query(
      "INSERT INTO partner_clicks(partner_id, invitation_code, ip, user_agent) VALUES($1, $2, $3, $4)",
      [partnerId, String(token).trim(), ip, userAgent],
    );
    return res.json({ ok: true });
  } catch (error) {
    console.error("[partner track-click] failed", error);
    return res.json({ ok: false });
  }
});

// Get partner dashboard stats
app.get("/api/partner/stats", requireAuth, async (req, res) => {
  try {
    const partner = await getOrCreatePartnerForUser(req.authUserId);
    if (!partner) return res.status(404).json({ message: "User not found." });
    const partnerId = partner.id;
    await autoApprovePartnerCommissionsForPartner(partnerId);

    const clicks = await pool.query(
      "SELECT COUNT(*)::int AS total FROM partner_clicks WHERE partner_id = $1",
      [partnerId],
    );

    const referrals = await pool.query(
      "SELECT COUNT(*)::int AS total FROM partner_referrals WHERE partner_id = $1",
      [partnerId],
    );

    const customers = await pool.query(
      `SELECT COUNT(DISTINCT pr.user_id)::int AS total
       FROM partner_referrals pr
       JOIN challenge_orders co ON co.user_id = pr.user_id
       WHERE pr.partner_id = $1 AND co.status = $2`,
      [partnerId, PAYMENT_STATUS.COMPLETED],
    );

    const commissions = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN status = 'pending'  THEN amount ELSE 0 END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS approved,
        COALESCE(SUM(CASE WHEN status = 'paid'     THEN amount ELSE 0 END), 0) AS paid,
        COALESCE(SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END), 0) AS rejected,
        COALESCE(SUM(amount), 0) AS total
       FROM partner_commissions WHERE partner_id = $1`,
      [partnerId],
    );

    const links = await pool.query(
      "SELECT id, token, label, created_at FROM partner_referral_links WHERE partner_id = $1 ORDER BY created_at ASC",
      [partnerId],
    );

    return res.json({
      partner,
      stats: {
        clicks: clicks.rows[0].total,
        referrals: referrals.rows[0].total,
        customers: customers.rows[0].total,
        commissions: {
          pending:  Number(commissions.rows[0].pending),
          approved: Number(commissions.rows[0].approved),
          paid:     Number(commissions.rows[0].paid),
          rejected: Number(commissions.rows[0].rejected),
          total:    Number(commissions.rows[0].total),
        },
      },
      links: links.rows,
    });
  } catch (error) {
    console.error("[partner stats] failed", error);
    return res.status(500).json({ message: "Failed to load stats." });
  }
});

// Get partner referrals list
app.get("/api/partner/referrals", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });
  const partnerId = partnerRow.id;

  try {
    const referrals = await pool.query(
      `SELECT
        pr.user_id,
        pr.invitation_code,
        pr.registered_at,
        u.email,
        u.name,
        u.surname,
        COALESCE(
          (SELECT SUM(co.amount) FROM challenge_orders co WHERE co.user_id = pr.user_id AND co.status = $2),
          0
        ) AS total_spent,
        COALESCE(
          (SELECT SUM(pc.amount) FROM partner_commissions pc WHERE pc.user_id = pr.user_id AND pc.partner_id = $1),
          0
        ) AS commission_earned,
        (SELECT MIN(co.created_at) FROM challenge_orders co WHERE co.user_id = pr.user_id AND co.status = $2) AS first_purchase_at,
        CASE
          WHEN EXISTS(SELECT 1 FROM challenge_orders co WHERE co.user_id = pr.user_id AND co.status = $2)
          THEN 'Customer'
          ELSE 'Sign Up'
        END AS status
       FROM partner_referrals pr
       JOIN app_users u ON u.id = pr.user_id
       WHERE pr.partner_id = $1
       ORDER BY pr.registered_at DESC`,
      [partnerId, PAYMENT_STATUS.COMPLETED],
    );

    return res.json({ referrals: referrals.rows });
  } catch (error) {
    console.error("[partner referrals] failed", error);
    return res.status(500).json({ message: "Failed to load referrals." });
  }
});

// Export referrals as CSV
app.get("/api/partner/referrals/export", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });
  const partnerId = partnerRow.id;

  try {
    const result = await pool.query(
      `SELECT
        u.name, u.surname, u.email,
        pr.invitation_code,
        pr.registered_at,
        COALESCE(
          (SELECT SUM(co.amount) FROM challenge_orders co WHERE co.user_id = pr.user_id AND co.status = $2),
          0
        ) AS total_spent,
        COALESCE(
          (SELECT SUM(pc.amount) FROM partner_commissions pc WHERE pc.user_id = pr.user_id AND pc.partner_id = $1),
          0
        ) AS commission_earned,
        (SELECT MIN(co.created_at) FROM challenge_orders co WHERE co.user_id = pr.user_id AND co.status = $2) AS first_purchase_at,
        CASE
          WHEN EXISTS(SELECT 1 FROM challenge_orders co WHERE co.user_id = pr.user_id AND co.status = $2)
          THEN 'Customer'
          ELSE 'Sign Up'
        END AS status
       FROM partner_referrals pr
       JOIN app_users u ON u.id = pr.user_id
       WHERE pr.partner_id = $1
       ORDER BY pr.registered_at DESC`,
      [partnerId, PAYMENT_STATUS.COMPLETED],
    );

    const esc = (v) => {
      const s = String(v ?? "");
      return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const headers = ["Name", "Surname", "Email", "Invitation Code", "Registered At", "Total Spent ($)", "Commission Earned ($)", "First Purchase", "Status"];
    const rows = result.rows.map((r) => [
      r.name, r.surname, r.email, r.invitation_code,
      r.registered_at ? new Date(r.registered_at).toISOString() : "",
      Number(r.total_spent).toFixed(2),
      Number(r.commission_earned).toFixed(2),
      r.first_purchase_at ? new Date(r.first_purchase_at).toISOString() : "",
      r.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.map(esc).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="referrals.csv"');
    return res.send(csv);
  } catch (error) {
    console.error("[partner export] failed", error);
    return res.status(500).json({ message: "Failed to export." });
  }
});

// Create a new referral link
app.post("/api/partner/referral-links", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });
  const partnerId = partnerRow.id;
  const { token, label } = req.body;

  if (!token || !String(token).trim()) return res.status(400).json({ message: "Token is required." });

  const cleanToken = String(token).trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");

  try {
    const insert = await pool.query(
      "INSERT INTO partner_referral_links(partner_id, token, label) VALUES($1, $2, $3) RETURNING *",
      [partnerId, cleanToken, label || "Custom Link"],
    );
    return res.status(201).json({ link: insert.rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ message: "This token is already taken." });
    console.error("[partner new link] failed", error);
    return res.status(500).json({ message: "Failed to create link." });
  }
});

// Customize primary invitation code
app.patch("/api/partner/invitation-code", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });
  const partnerId = partnerRow.id;
  const { invitationCode } = req.body;

  if (!invitationCode || !String(invitationCode).trim()) return res.status(400).json({ message: "Invitation code is required." });

  const cleanCode = String(invitationCode).trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");

  try {
    const update = await pool.query(
      "UPDATE partners SET invitation_code = $1 WHERE id = $2 RETURNING id, invitation_code",
      [cleanCode, partnerId],
    );
    return res.json({ invitationCode: update.rows[0].invitation_code });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ message: "This invitation code is already taken." });
    console.error("[partner update code] failed", error);
    return res.status(500).json({ message: "Failed to update invitation code." });
  }
});

// Create a promo code for checkout discount (1..30%)
app.post("/api/partner/promo-codes", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });

  const { code, discountPercent, expiresAt } = req.body || {};
  if (!code || !String(code).trim()) {
    return res.status(400).json({ message: "Promo code is required." });
  }

  const cleanCode = String(code)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!cleanCode) {
    return res.status(400).json({ message: "Promo code is invalid." });
  }

  const parsedDiscount = Number(discountPercent);
  const partnerMaxPromoDiscount = (() => {
    const parsed = Number(partnerRow.max_promo_discount_percent);
    if (!Number.isFinite(parsed)) return DEFAULT_PARTNER_PROMO_MAX_DISCOUNT;
    return Math.min(ABSOLUTE_PARTNER_PROMO_MAX_DISCOUNT, Math.max(1, Math.floor(parsed)));
  })();

  if (!Number.isFinite(parsedDiscount) || parsedDiscount <= 0 || parsedDiscount > partnerMaxPromoDiscount) {
    return res.status(400).json({ message: `Discount must be between 1 and ${partnerMaxPromoDiscount}.` });
  }

  const normalizedExpiresAt = typeof expiresAt === "string" ? expiresAt.trim() : "";
  if (!normalizedExpiresAt) {
    return res.status(400).json({ message: "Expiration date is required." });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedExpiresAt)) {
    return res.status(400).json({ message: "Expiration date is invalid." });
  }

  const expiresDate = new Date(`${normalizedExpiresAt}T00:00:00.000Z`);
  if (Number.isNaN(expiresDate.getTime())) {
    return res.status(400).json({ message: "Expiration date is invalid." });
  }

  const now = new Date();
  const minDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const maxDate = new Date(minDate.getTime());
  maxDate.setUTCMonth(maxDate.getUTCMonth() + 2);
  if (expiresDate.getTime() < minDate.getTime() || expiresDate.getTime() > maxDate.getTime()) {
    return res.status(400).json({ message: "Expiration date must be from today up to 2 months ahead." });
  }

  const normalizedDiscount = roundMoney(parsedDiscount);

  try {
    const insert = await pool.query(
      `INSERT INTO coupon_codes(code, partner_id, discount_percent, max_uses_per_user, active, expires_at)
       VALUES($1, $2, $3, 1, TRUE, $4)
       RETURNING id,
                 code,
                 discount_percent,
                 max_uses_per_user,
                 active,
                 TO_CHAR(expires_at::date, 'YYYY-MM-DD') AS expires_at_date,
                 created_at`,
      [cleanCode, partnerRow.id, normalizedDiscount, normalizedExpiresAt],
    );

    const promo = insert.rows[0];
    return res.status(201).json({
      promoCode: {
        id: promo.id,
        code: promo.code,
        discountPercent: Number(promo.discount_percent),
        maxUsesPerUser: Number(promo.max_uses_per_user),
        active: Boolean(promo.active),
        expiresAt: promo.expires_at_date,
        createdAt: promo.created_at,
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "This promo code is already taken." });
    }
    console.error("[partner promo-code] failed", error);
    return res.status(500).json({ message: "Failed to create promo code." });
  }
});

app.get("/api/partner/promo-codes", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });

  try {
    const result = await pool.query(
      `SELECT id,
              code,
              discount_percent,
              max_uses_per_user,
              active,
              TO_CHAR(expires_at::date, 'YYYY-MM-DD') AS expires_at_date,
              created_at,
              (expires_at IS NOT NULL AND expires_at::date < CURRENT_DATE) AS is_expired
         FROM coupon_codes
        WHERE partner_id = $1 AND active = TRUE
        ORDER BY created_at DESC`,
      [partnerRow.id],
    );

    const promoCodes = result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      discountPercent: Number(row.discount_percent),
      maxUsesPerUser: Number(row.max_uses_per_user),
      active: Boolean(row.active),
      expiresAt: row.expires_at_date,
      createdAt: row.created_at,
      isExpired: Boolean(row.is_expired),
    }));

    return res.json({ promoCodes });
  } catch (error) {
    console.error("[partner promo-codes] failed", error);
    return res.status(500).json({ message: "Failed to load promo codes." });
  }
});

app.delete("/api/partner/promo-codes/:promoCodeId", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });

  const promoCodeId = Number(req.params.promoCodeId);
  if (!Number.isInteger(promoCodeId) || promoCodeId <= 0) {
    return res.status(400).json({ message: "Invalid promo code id." });
  }

  try {
    const result = await pool.query(
      `UPDATE coupon_codes
          SET active = FALSE
        WHERE id = $1 AND partner_id = $2 AND active = TRUE
      RETURNING id`,
      [promoCodeId, partnerRow.id],
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: "Promo code not found." });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error("[partner delete promo-code] failed", error);
    return res.status(500).json({ message: "Failed to delete promo code." });
  }
});

// Delete a referral link
app.delete("/api/partner/referral-links/:linkId", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });
  const linkId = Number(req.params.linkId);
  if (!linkId) return res.status(400).json({ message: "Invalid link id." });
  try {
    const del = await pool.query(
      "DELETE FROM partner_referral_links WHERE id = $1 AND partner_id = $2 RETURNING id",
      [linkId, partnerRow.id],
    );
    if (!del.rowCount) return res.status(404).json({ message: "Link not found." });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[partner delete link] failed", err);
    return res.status(500).json({ message: "Failed to delete link." });
  }
});

// Get commissions list (with optional status/date filters)
app.get("/api/partner/commissions", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });
  const partnerId = partnerRow.id;
  await autoApprovePartnerCommissionsForPartner(partnerId);

  const { status, from, to, limit = 100, offset = 0 } = req.query;
  const conditions = ["pc.partner_id = $1"];
  const params = [partnerId];
  let idx = 2;

  if (status) { conditions.push(`pc.status = $${idx++}`); params.push(status); }
  if (from)   { conditions.push(`pc.created_at >= $${idx++}`); params.push(from); }
  if (to)     { conditions.push(`pc.created_at <= $${idx++}`); params.push(to); }

  const where = conditions.join(" AND ");

  try {
    const rows = await pool.query(
      `SELECT
         pc.id, pc.amount, pc.status, pc.created_at, pc.approved_at, pc.payout_id,
         u.email
       FROM partner_commissions pc
       JOIN app_users u ON u.id = pc.user_id
       WHERE ${where}
       ORDER BY pc.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, Number(limit), Number(offset)],
    );

    const totals = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'pending'  THEN amount ELSE 0 END), 0) AS pending,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS approved,
         COALESCE(SUM(CASE WHEN status = 'paid'     THEN amount ELSE 0 END), 0) AS paid,
         COALESCE(SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END), 0) AS rejected,
         COUNT(*) FILTER (WHERE status = 'pending')::int  AS pending_count,
         COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_count,
         COUNT(*) FILTER (WHERE status = 'paid')::int     AS paid_count,
         COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected_count
       FROM partner_commissions WHERE partner_id = $1`,
      [partnerId],
    );

    // Mask emails
    const commissions = rows.rows.map((r) => ({
      ...r,
      amount: Number(r.amount),
      email: r.email ? r.email.replace(/(?<=.).(?=.*@)/g, "*") : "***",
    }));

    const totalsRow = totals.rows[0];
    return res.json({
      commissions,
      totals: {
        pending:  Number(totalsRow.pending),
        approved: Number(totalsRow.approved),
        paid:     Number(totalsRow.paid),
        rejected: Number(totalsRow.rejected),
      },
      counts: {
        pending:  Number(totalsRow.pending_count),
        approved: Number(totalsRow.approved_count),
        paid:     Number(totalsRow.paid_count),
        rejected: Number(totalsRow.rejected_count),
      },
    });
  } catch (err) {
    console.error("[partner commissions] failed", err);
    return res.status(500).json({ message: "Failed to load commissions." });
  }
});

// Get tier info + current metrics
app.get("/api/partner/tier", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });
  const partnerId = partnerRow.id;
  await autoApprovePartnerCommissionsForPartner(partnerId);

  try {
    const clicks = await pool.query(
      "SELECT COUNT(*)::int AS total FROM partner_clicks WHERE partner_id = $1",
      [partnerId],
    );
    const referrals = await pool.query(
      "SELECT COUNT(*)::int AS total FROM partner_referrals WHERE partner_id = $1",
      [partnerId],
    );
    const clients = await pool.query(
      `SELECT COUNT(DISTINCT pr.user_id)::int AS total
       FROM partner_referrals pr
       JOIN challenge_orders co ON co.user_id = pr.user_id
       WHERE pr.partner_id = $1 AND co.status = $2`,
      [partnerId, PAYMENT_STATUS.COMPLETED],
    );

    const totalClicks = clicks.rows[0].total;
    const totalClients = clients.rows[0].total;

    // Determine tier by clicks + clients
    let tier = PARTNER_TIERS[0];
    for (const t of PARTNER_TIERS) {
      if (totalClicks >= t.minClicks && totalClients >= t.minClients) tier = t;
    }

    // Update tier in DB if changed
    if (partnerRow.tier !== tier.name) {
      await pool.query("UPDATE partners SET tier = $1 WHERE id = $2", [tier.name, partnerId]);
    }

    return res.json({
      currentTier: tier,
      tiers: PARTNER_TIERS,
      metrics: {
        clicks: totalClicks,
        referrals: referrals.rows[0].total,
        clients: totalClients,
      },
    });
  } catch (err) {
    console.error("[partner tier] failed", err);
    return res.status(500).json({ message: "Failed to load tier." });
  }
});

// Get payout settings + history
app.get("/api/partner/payouts", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });
  const partnerId = partnerRow.id;
  await autoApprovePartnerCommissionsForPartner(partnerId);

  try {
    // Available = approved, not yet paid out
    const balanceRow = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) AS available,
         COALESCE(SUM(CASE WHEN status = 'pending'  THEN amount ELSE 0 END), 0) AS pending,
         COALESCE(SUM(CASE WHEN status = 'paid'     THEN amount ELSE 0 END), 0) AS paid_total
       FROM partner_commissions WHERE partner_id = $1`,
      [partnerId],
    );

    const payouts = await pool.query(
      `SELECT id, amount, method, wallet, status, period_start, period_end, paid_at, created_at
       FROM partner_payouts WHERE partner_id = $1 ORDER BY created_at DESC`,
      [partnerId],
    );

    const referralCount = await pool.query(
      "SELECT COUNT(*)::int AS total FROM partner_referrals WHERE partner_id = $1",
      [partnerId],
    );

    // Next payout date: 1st of next month
    const now = new Date();
    const nextPayout = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return res.json({
      balance: {
        available: Number(balanceRow.rows[0].available),
        pending:   Number(balanceRow.rows[0].pending),
        paidTotal: Number(balanceRow.rows[0].paid_total),
      },
      payoutSettings: {
        method: partnerRow.payout_method || "USDT_TRC20",
        wallet: partnerRow.payout_wallet || "",
      },
      conditions: {
        minAmount:           PARTNER_MIN_PAYOUT_AMOUNT,
        firstPayoutReferrals: PARTNER_FIRST_PAYOUT_REFERRALS,
        processingDays:      PARTNER_PAYOUT_PROCESSING_DAYS,
        holdDays:            PARTNER_COMMISSION_HOLD_DAYS,
        nextPayoutDate:      nextPayout.toISOString().split("T")[0],
      },
      referralCount: referralCount.rows[0].total,
      payouts: payouts.rows,
    });
  } catch (err) {
    console.error("[partner payouts] failed", err);
    return res.status(500).json({ message: "Failed to load payouts." });
  }
});

// Update payout wallet / method
app.patch("/api/partner/payout-settings", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });
  const { wallet, method } = req.body;
  const updates = [];
  const params = [];
  let idx = 1;

  if (wallet !== undefined) { updates.push(`payout_wallet = $${idx++}`); params.push(String(wallet).trim()); }
  if (method !== undefined) { updates.push(`payout_method = $${idx++}`); params.push(String(method).trim()); }
  if (!updates.length) return res.status(400).json({ message: "Nothing to update." });

  params.push(partnerRow.id);
  try {
    await pool.query(`UPDATE partners SET ${updates.join(", ")} WHERE id = $${idx}`, params);
    return res.json({ ok: true });
  } catch (err) {
    console.error("[partner payout-settings] failed", err);
    return res.status(500).json({ message: "Failed to update settings." });
  }
});

// Request manual payout
app.post("/api/partner/payouts/request", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });
  const partnerId = partnerRow.id;
  await autoApprovePartnerCommissionsForPartner(partnerId);

  try {
    // Check conditions
    const referralCount = await pool.query(
      "SELECT COUNT(*)::int AS total FROM partner_referrals WHERE partner_id = $1",
      [partnerId],
    );
    if (referralCount.rows[0].total < PARTNER_FIRST_PAYOUT_REFERRALS) {
      return res.status(400).json({
        message: `Першая виплата доступна після ${PARTNER_FIRST_PAYOUT_REFERRALS} рефералів. Зараз: ${referralCount.rows[0].total}.`,
      });
    }

    const availableRow = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) AS available FROM partner_commissions WHERE partner_id = $1 AND status = 'approved'",
      [partnerId],
    );
    const available = Number(availableRow.rows[0].available);

    if (available < PARTNER_MIN_PAYOUT_AMOUNT) {
      return res.status(400).json({
        message: `Мінімальна сума виплати $${PARTNER_MIN_PAYOUT_AMOUNT}. Доступно: $${available.toFixed(2)}.`,
      });
    }

    if (!partnerRow.payout_wallet) {
      return res.status(400).json({ message: "Вкажіть гаманець для виплати в налаштуваннях." });
    }

    // Create payout record
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const periodEnd   = now.toISOString().split("T")[0];

    const payout = await pool.query(
      `INSERT INTO partner_payouts(partner_id, amount, method, wallet, status, period_start, period_end)
       VALUES($1, $2, $3, $4, 'processing', $5, $6) RETURNING id`,
      [partnerId, available, partnerRow.payout_method || "USDT_TRC20", partnerRow.payout_wallet, periodStart, periodEnd],
    );
    const payoutId = payout.rows[0].id;

    // Mark approved commissions as paid
    await pool.query(
      "UPDATE partner_commissions SET status = 'paid', payout_id = $1 WHERE partner_id = $2 AND status = 'approved'",
      [payoutId, partnerId],
    );

    console.log(`[partner payout] partner ${partnerId} requested payout $${available} (payout id: ${payoutId})`);
    return res.status(201).json({ ok: true, payoutId, amount: available });
  } catch (err) {
    console.error("[partner payout request] failed", err);
    return res.status(500).json({ message: "Failed to create payout request." });
  }
});

// Enhanced stats with date-range + daily breakdown
app.get("/api/partner/dashboard", requireAuth, async (req, res) => {
  const partnerRow = await getOrCreatePartnerForUser(req.authUserId);
  if (!partnerRow) return res.status(404).json({ message: "User not found." });
  const partnerId = partnerRow.id;
  await autoApprovePartnerCommissionsForPartner(partnerId);

  // Default: current month
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const defaultTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  const from = req.query.from || defaultFrom;
  const to   = req.query.to   || defaultTo;

  try {
    const [
      clicksRow,
      referralsRow,
      clientsRow,
      earningsRow,
      dailyClicksRow,
      dailyEarningsRow,
      linkRows,
      subIdClicksRows,
      subIdRegistrationsRows,
      subIdPurchasesRows,
    ] = await Promise.all([
      // Total clicks in period
      pool.query(
        "SELECT COUNT(*)::int AS total FROM partner_clicks WHERE partner_id = $1 AND created_at BETWEEN $2 AND $3",
        [partnerId, from, to],
      ),
      // Total registrations in period
      pool.query(
        "SELECT COUNT(*)::int AS total FROM partner_referrals WHERE partner_id = $1 AND registered_at BETWEEN $2 AND $3",
        [partnerId, from, to],
      ),
      // Unique clients (with purchase) in period
      pool.query(
        `SELECT COUNT(DISTINCT pr.user_id)::int AS total
         FROM partner_referrals pr
         JOIN challenge_orders co ON co.user_id = pr.user_id
         WHERE pr.partner_id = $1 AND co.status = $2 AND co.created_at BETWEEN $3 AND $4`,
        [partnerId, PAYMENT_STATUS.COMPLETED, from, to],
      ),
      // Earnings in period
      pool.query(
        "SELECT COALESCE(SUM(amount), 0) AS total FROM partner_commissions WHERE partner_id = $1 AND created_at BETWEEN $2 AND $3",
        [partnerId, from, to],
      ),
      // Daily clicks
      pool.query(
        `SELECT DATE(created_at) AS day, COUNT(*)::int AS clicks
         FROM partner_clicks
         WHERE partner_id = $1 AND created_at BETWEEN $2 AND $3
         GROUP BY day ORDER BY day`,
        [partnerId, from, to],
      ),
      // Daily earnings
      pool.query(
        `SELECT DATE(created_at) AS day, COALESCE(SUM(amount), 0) AS earnings
         FROM partner_commissions
         WHERE partner_id = $1 AND created_at BETWEEN $2 AND $3
         GROUP BY day ORDER BY day`,
        [partnerId, from, to],
      ),
      // All primary/custom tokens so empty rows still render in Sub-ID reports
      pool.query(
        `SELECT NULL::int AS id, invitation_code AS token, 'Основне посилання' AS label, true AS is_primary
           FROM partners
          WHERE id = $1
         UNION ALL
         SELECT id, token, label, false AS is_primary
           FROM partner_referral_links
          WHERE partner_id = $1
          ORDER BY is_primary DESC, label ASC`,
        [partnerId],
      ),
      // Sub-ID clicks by token
      pool.query(
        `SELECT invitation_code AS token, COUNT(*)::int AS clicks
           FROM partner_clicks
          WHERE partner_id = $1 AND created_at BETWEEN $2 AND $3
          GROUP BY invitation_code`,
        [partnerId, from, to],
      ),
      // Sub-ID registrations by token
      pool.query(
        `SELECT invitation_code AS token, COUNT(*)::int AS registrations
           FROM partner_referrals
          WHERE partner_id = $1 AND registered_at BETWEEN $2 AND $3
          GROUP BY invitation_code`,
        [partnerId, from, to],
      ),
      // Sub-ID purchases/turnover/commission by token
      pool.query(
        `SELECT pr.invitation_code AS token,
                COUNT(co.id)::int AS purchases,
                COALESCE(SUM(co.amount::numeric), 0) AS turnover,
                COALESCE(SUM(pc.amount::numeric), 0) AS commission
           FROM partner_referrals pr
           JOIN challenge_orders co
             ON co.user_id = pr.user_id
           LEFT JOIN partner_commissions pc
             ON pc.order_id = co.id AND pc.partner_id = pr.partner_id
          WHERE pr.partner_id = $1
            AND co.status = $2
            AND co.created_at BETWEEN $3 AND $4
          GROUP BY pr.invitation_code`,
        [partnerId, PAYMENT_STATUS.COMPLETED, from, to],
      ),
    ]);

    // Merge daily clicks + earnings into one array
    const dailyMap = {};
    for (const r of dailyClicksRow.rows)  { const d = r.day.toISOString().split("T")[0]; dailyMap[d] = { date: d, clicks: r.clicks, earnings: 0 }; }
    for (const r of dailyEarningsRow.rows) { const d = r.day.toISOString().split("T")[0]; if (!dailyMap[d]) dailyMap[d] = { date: d, clicks: 0, earnings: 0 }; dailyMap[d].earnings = Number(r.earnings); }
    const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const subIdMap = new Map();
    const ensureSubId = (token, details = {}) => {
      const normalizedToken = String(token || "").trim();
      if (!normalizedToken) return null;
      const key = normalizedToken.toLowerCase();
      if (!subIdMap.has(key)) {
        subIdMap.set(key, {
          id: details.id ?? null,
          token: normalizedToken,
          label: details.label || normalizedToken,
          isPrimary: Boolean(details.isPrimary),
          clicks: 0,
          registrations: 0,
          purchases: 0,
          turnover: 0,
          commission: 0,
        });
      } else {
        const existing = subIdMap.get(key);
        if (details.label) existing.label = details.label;
        if (details.id !== undefined) existing.id = details.id;
        if (details.isPrimary) existing.isPrimary = true;
      }
      return subIdMap.get(key);
    };

    for (const row of linkRows.rows) {
      ensureSubId(row.token, { id: row.id, label: row.label, isPrimary: row.is_primary });
    }
    for (const row of subIdClicksRows.rows) {
      const item = ensureSubId(row.token);
      if (item) item.clicks = Number(row.clicks || 0);
    }
    for (const row of subIdRegistrationsRows.rows) {
      const item = ensureSubId(row.token);
      if (item) item.registrations = Number(row.registrations || 0);
    }
    for (const row of subIdPurchasesRows.rows) {
      const item = ensureSubId(row.token);
      if (item) {
        item.purchases = Number(row.purchases || 0);
        item.turnover = Number(row.turnover || 0);
        item.commission = Number(row.commission || 0);
      }
    }

    const subIds = Array.from(subIdMap.values())
      .map((item) => ({
        ...item,
        turnover: roundMoney(item.turnover),
        commission: roundMoney(item.commission),
        managerCommission: 0,
        registrationRate: item.clicks > 0 ? roundMoney((item.registrations / item.clicks) * 100) : 0,
        purchaseRate: item.registrations > 0 ? roundMoney((item.purchases / item.registrations) * 100) : 0,
      }))
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.turnover - a.turnover || a.label.localeCompare(b.label));

    return res.json({
      period: { from, to },
      summary: {
        clicks:      clicksRow.rows[0].total,
        referrals:   referralsRow.rows[0].total,
        clients:     clientsRow.rows[0].total,
        earnings:    Number(earningsRow.rows[0].total),
      },
      daily,
      subIds,
    });
  } catch (err) {
    console.error("[partner dashboard] failed", err);
    return res.status(500).json({ message: "Failed to load dashboard." });
  }
});

const computeRealizedBalanceForOrder = async ({ userId, orderId, startingBalance, cutoffMs = null, db = pool }) => {
  const params = cutoffMs == null ? [userId, orderId] : [userId, orderId, cutoffMs];
  const cutoffTradeFilter = cutoffMs == null ? "" : " AND closed_at >= $3";

  const [tradeRes, orderRes] = await Promise.all([
    db.query(
      `SELECT COALESCE(SUM(pnl::numeric), 0) AS total_pnl
         FROM trading_trade_history
        WHERE user_id = $1 AND order_id = $2${cutoffTradeFilter}`,
      params,
    ),
    db.query(
      `SELECT type, size_usdt, created_at_ms, filled_at_ms
         FROM trading_order_history
        WHERE user_id = $1 AND order_id = $2`,
      [userId, orderId],
    ),
  ]);

  let totalFees = 0;
  for (const order of orderRes.rows) {
    if (order.type !== "market" && !order.filled_at_ms) continue;
    const ts = Number(order.filled_at_ms || order.created_at_ms);
    if (cutoffMs != null && ts < cutoffMs) continue;
    const feeRate = order.type === "market" ? TRADING_FEE_RATE.market : TRADING_FEE_RATE.limit;
    totalFees += Number(order.size_usdt) * feeRate;
  }

  const closedPnl = Number(tradeRes.rows[0]?.total_pnl || 0);
  return {
    currentBalance: roundMoney(Number(startingBalance) + closedPnl - totalFees),
    closedPnl: roundMoney(closedPnl),
    totalFees: roundMoney(totalFees),
  };
};

const getFundedWithdrawalSummary = async (userId, db = pool) => {
  const fundedRows = await db.query(
    `SELECT id, challenge_id, challenge_name, created_at, stage_started_at, stage, status, challenge_type
       FROM challenge_orders
      WHERE user_id = $1
        AND UPPER(status) IN ('${PAYMENT_STATUS.COMPLETED}', 'PASSED')
        AND (challenge_type = 'funded' OR stage >= 3 OR UPPER(status) = 'PASSED')
      ORDER BY created_at DESC`,
    [userId],
  );

  if (!fundedRows.rowCount) {
    return {
      available: 0,
      pending: 0,
      paid: 0,
      grossProfit: 0,
      payoutableProfit: 0,
      profitShareRate: FUNDED_PROFIT_SHARE_RATE,
      fundedChallenges: [],
    };
  }

  const ids = fundedRows.rows.map((row) => row.id);
  const payoutsByChallenge = new Map();
  const payoutRows = await db.query(
    `SELECT challenge_id,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending,
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paid
       FROM user_withdrawal_requests
      WHERE user_id = $1 AND challenge_id = ANY($2::int[])
      GROUP BY challenge_id`,
    [userId, ids],
  );
  for (const row of payoutRows.rows) {
    payoutsByChallenge.set(Number(row.challenge_id), {
      pending: Number(row.pending || 0),
      paid: Number(row.paid || 0),
    });
  }

  const fundedChallenges = [];
  for (const row of fundedRows.rows) {
    const challenge = challenges.find((item) => item.id === row.challenge_id)
      || challenges.find((item) => item.name.toLowerCase() === String(row.challenge_name || "").toLowerCase());
    const startingBalance = challenge ? challenge.balance : 0;
    const fundedStartedAt = row.stage_started_at || row.created_at;
    const cutoffMs = fundedStartedAt ? new Date(fundedStartedAt).getTime() : null;
    const realized = await computeRealizedBalanceForOrder({
      userId,
      orderId: row.id,
      startingBalance,
      cutoffMs: Number.isFinite(cutoffMs) ? cutoffMs : null,
      db,
    });

    const grossProfit = roundMoney(Math.max(0, realized.currentBalance - startingBalance));
    const payoutableProfit = roundMoney(grossProfit * FUNDED_PROFIT_SHARE_RATE);
    const used = payoutsByChallenge.get(row.id) || { pending: 0, paid: 0 };
    const available = roundMoney(Math.max(0, payoutableProfit - used.pending - used.paid));

    fundedChallenges.push({
      id: row.id,
      challengeId: row.challenge_id,
      challengeName: row.challenge_name,
      startingBalance,
      currentBalance: realized.currentBalance,
      grossProfit,
      payoutableProfit,
      available,
      pending: roundMoney(used.pending),
      paid: roundMoney(used.paid),
      profitShareRate: FUNDED_PROFIT_SHARE_RATE,
      fundedStartedAt,
    });
  }

  return {
    available: roundMoney(fundedChallenges.reduce((sum, item) => sum + item.available, 0)),
    pending: roundMoney(fundedChallenges.reduce((sum, item) => sum + item.pending, 0)),
    paid: roundMoney(fundedChallenges.reduce((sum, item) => sum + item.paid, 0)),
    grossProfit: roundMoney(fundedChallenges.reduce((sum, item) => sum + item.grossProfit, 0)),
    payoutableProfit: roundMoney(fundedChallenges.reduce((sum, item) => sum + item.payoutableProfit, 0)),
    profitShareRate: FUNDED_PROFIT_SHARE_RATE,
    fundedChallenges,
  };
};

/* ═══════════════════════════════════════════════════════
   USER WITHDRAWAL ENDPOINTS
═══════════════════════════════════════════════════════ */

// GET /api/withdrawals — history + summary for current user
app.get("/api/withdrawals", requireAuth, async (req, res) => {
  const userId = req.authUserId;
  try {
    const [reqRows, settRows, fundedSummary] = await Promise.all([
      pool.query(
        `SELECT id, amount, coin, network, address, status, created_at, paid_at
         FROM user_withdrawal_requests
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId],
      ),
      pool.query(
        `SELECT method, wallet FROM user_withdrawal_settings WHERE user_id = $1`,
        [userId],
      ),
      getFundedWithdrawalSummary(userId),
    ]);

    const requests = reqRows.rows;
    const settings = settRows.rows[0] || { method: "USDT_TRC20", wallet: "" };

    return res.json({
      requests,
      pending: fundedSummary.pending,
      paid: fundedSummary.paid,
      available: fundedSummary.available,
      grossProfit: fundedSummary.grossProfit,
      payoutableProfit: fundedSummary.payoutableProfit,
      profitShareRate: fundedSummary.profitShareRate,
      fundedChallenges: fundedSummary.fundedChallenges,
      settings,
    });
  } catch (err) {
    console.error("[withdrawals GET]", err);
    return res.status(500).json({ message: "Failed to load withdrawals." });
  }
});

// GET /api/withdrawals/settings
app.get("/api/withdrawals/settings", requireAuth, async (req, res) => {
  const userId = req.authUserId;
  try {
    const { rows } = await pool.query(
      `SELECT method, wallet FROM user_withdrawal_settings WHERE user_id = $1`, [userId],
    );
    return res.json(rows[0] || { method: "USDT_TRC20", wallet: "" });
  } catch (err) {
    return res.status(500).json({ message: "Failed." });
  }
});

// PATCH /api/withdrawals/settings
app.patch("/api/withdrawals/settings", requireAuth, async (req, res) => {
  const userId = req.authUserId;
  const { method, wallet } = req.body;
  try {
    await pool.query(
      `INSERT INTO user_withdrawal_settings (user_id, method, wallet, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE SET method = $2, wallet = $3, updated_at = NOW()`,
      [userId, method || "USDT_TRC20", wallet || ""],
    );
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Failed." });
  }
});

// POST /api/withdrawals/request — create a withdrawal request
app.post("/api/withdrawals/request", requireAuth, async (req, res) => {
  const userId = req.authUserId;
  const { amount, coin, network, address, challengeId } = req.body;
  if (!amount || !address) return res.status(400).json({ message: "amount and address are required" });

  try {
    const amountNum = roundMoney(Number(amount));
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount." });
    }

    const fundedSummary = await getFundedWithdrawalSummary(userId);
    const requestedChallengeId = Number(challengeId);
    const selectedChallenge = Number.isFinite(requestedChallengeId)
      ? fundedSummary.fundedChallenges.find((item) => item.id === requestedChallengeId)
      : fundedSummary.fundedChallenges.find((item) => item.available > 0);

    if (!selectedChallenge) {
      return res.status(400).json({ message: "No funded profit available for withdrawal." });
    }

    if (amountNum > selectedChallenge.available + 0.005) {
      return res.status(400).json({
        message: `Maximum available withdrawal is $${selectedChallenge.available.toFixed(2)}.`,
      });
    }

    const payoutCoin = coin || "USDT";
    const payoutNetwork = network || "TRC-20";
    const { rows } = await pool.query(
      `INSERT INTO user_withdrawal_requests (user_id, challenge_id, amount, coin, network, address, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, created_at`,
      [userId, selectedChallenge.id, amountNum, payoutCoin, payoutNetwork, address],
    );
    const row = rows[0];

    // Send Telegram notification
    const TG_BOT_TOKEN = "8690857200:AAGiJu8yAv_lmzX3SqKi3RYe5ErAHf_3Guo";
    const TG_CHAT_IDS = (process.env.VITE_TG_CHAT_IDS || "").split(",").map(s => s.trim()).filter(Boolean);
    const userRow = await pool.query("SELECT name, surname, email, account_id FROM app_users WHERE id=$1", [userId]);
    const u = userRow.rows[0] || {};
    const name = `${u.name || ""} ${u.surname || ""}`.trim() || "—";
    const fee = payoutCoin === "USDT" && payoutNetwork === "TRC-20" ? 1 : payoutCoin === "USDT" && payoutNetwork === "ERC-20" ? 5 : payoutCoin === "USDT" ? 0.5 : 0;
    const youReceive = Math.max(0, amountNum - fee);
    const msg =
      `💸 <b>Новий запит на виплату</b>\n\n` +
      `👤 <b>Користувач:</b> ${name}\n` +
      `🆔 <b>Account ID:</b> <code>${u.account_id || userId}</code>\n` +
      `📧 <b>Email:</b> ${u.email || "—"}\n\n` +
      `💰 <b>Сума:</b> ${amountNum} ${payoutCoin}\n` +
      `📦 <b>Мережа:</b> ${payoutNetwork}\n` +
      `📬 <b>Адреса:</b> <code>${address}</code>\n` +
      `✅ <b>До отримання:</b> ${youReceive.toFixed(8).replace(/\.?0+$/, "")} ${payoutCoin}\n` +
      `🔑 <b>Request ID:</b> #${row.id}`;
    await Promise.allSettled(
      TG_CHAT_IDS.map(chatId =>
        fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: "HTML" }),
        })
      )
    );

    return res.json({ ok: true, id: row.id });
  } catch (err) {
    console.error("[withdrawals POST]", err);
    return res.status(500).json({ message: "Failed to create withdrawal request." });
  }
});

// Auto-approve partner commissions older than HOLD_DAYS (runs every 6 hours)
const autoApprovePartnerCommissions = async () => {
  try {
    const result = await pool.query(
      `UPDATE partner_commissions
       SET status = 'approved', approved_at = NOW()
       WHERE status = 'pending'
         AND created_at <= NOW() - INTERVAL '${PARTNER_COMMISSION_HOLD_DAYS} days'
       RETURNING id`,
    );
    if (result.rowCount > 0) {
      console.log(`[partner cron] auto-approved ${result.rowCount} commission(s)`);
    }
  } catch (err) {
    console.error("[partner cron] auto-approve failed", err);
  }
};

ensureSchema()
  .then(() => {
    app.listen(port, host, () => {
      console.log("");
      console.log("════════════════════════════════════════════════════════════");
      console.log(`  UPDOWNX API server`);
      console.log(`  listening on        http://${host}:${port}`);
      console.log(`  crypto provider     ${CRYPTO_PAYMENT_PROVIDER}`);
      console.log(`  payments enabled    ${PAYMENTS_ENABLED}`);
      console.log(`  log verbose         ${LOG_VERBOSE} (set LOG_VERBOSE=1 to see polling)`);
      console.log("════════════════════════════════════════════════════════════");
      console.log("");
    });
    syncPlisioStatuses().catch((error) => {
      log.error("plisio:sync", "Initial sync failed", { error: error?.message || String(error) });
    });
    setInterval(() => {
      syncPlisioStatuses().catch((error) => {
        log.error("plisio:sync", "Interval sync failed", { error: error?.message || String(error) });
      });
    }, 10000);
    // Auto-approve commissions every 6 hours
    autoApprovePartnerCommissions().catch(() => {});
    setInterval(() => autoApprovePartnerCommissions().catch(() => {}), 6 * 60 * 60 * 1000);
  })
  .catch((error) => {
    console.error("Schema init failed:", error);
    process.exit(1);
  });
