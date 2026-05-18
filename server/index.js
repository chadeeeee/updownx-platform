import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import pg from 'pg'

const { Pool } = pg

/* ───────── Config ───────── */
const PORT = process.env.PORT || 4000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://postgres:postgres@localhost:5432/updownx',
})

/* ───────── Helpers ───────── */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const check = crypto.scryptSync(password, salt, 64).toString('hex')
  return hash === check
}

function makeToken(user) {
  // Simple base64 token (swap for jsonwebtoken in prod)
  const payload = { id: user.id, email: user.email, iat: Date.now() }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64url')
  return `${data}.${sig}`
}

function generatePublicId() {
  let id = ''
  for (let i = 0; i < 12; i++) id += Math.floor(Math.random() * 10)
  return id
}

function sanitiseUser(row) {
  return {
    id: row.id,
    public_id: row.public_id,
    name: row.name,
    surname: row.surname,
    email: row.email,
    created_at: row.created_at,
  }
}

/* ───────── In-memory verification codes ───────── */
const codes = new Map() // email → { code, expires }

/* ───────── DB init ───────── */
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      name          TEXT NOT NULL,
      surname       TEXT NOT NULL DEFAULT '',
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  // Add public_id column if missing
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id TEXT UNIQUE;
  `)

  // Backfill public_id for existing users
  const missing = await pool.query('SELECT id FROM users WHERE public_id IS NULL')
  for (const row of missing.rows) {
    await pool.query('UPDATE users SET public_id = $1 WHERE id = $2', [generatePublicId(), row.id])
  }

  console.log('[db] users table ready')
}

/* ───────── Express ───────── */
const app = express()
app.use(cors())
app.use(express.json())

// ---- Send verification code (stub — logs to console) ----
app.post('/api/auth/send-code', (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ message: 'Email is required' })

  const code = String(Math.floor(100000 + Math.random() * 900000))
  codes.set(email, { code, expires: Date.now() + 10 * 60 * 1000 })
  console.log(`[auth] Verification code for ${email}: ${code}`)

  res.json({ message: 'Code sent' })
})

// ---- Register ----
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, surname, email, password, verificationCode } = req.body

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' })

    // Verify code
    const stored = codes.get(email)
    if (!stored || stored.code !== verificationCode || Date.now() > stored.expires)
      return res.status(400).json({ message: 'Invalid or expired verification code' })

    codes.delete(email)

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rows.length)
      return res.status(409).json({ message: 'Email already registered' })

    const hash = hashPassword(password)
    const publicId = generatePublicId()
    const result = await pool.query(
      'INSERT INTO users (public_id, name, surname, email, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [publicId, name, surname || '', email, hash],
    )
    const user = sanitiseUser(result.rows[0])
    res.json({ user, token: makeToken(user) })
  } catch (err) {
    console.error('[register]', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ---- Login ----
// Accepts either an email or a numeric account id in the `email` field.
// No verification code is required — only the password must match.
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ message: 'Account ID/email and password are required' })

    const trimmed = String(email).trim()
    let result = await pool.query('SELECT * FROM users WHERE email = $1', [trimmed])
    if (!result.rows.length && /^\d+$/.test(trimmed)) {
      result = await pool.query('SELECT * FROM users WHERE id = $1', [Number(trimmed)])
    }
    if (!result.rows.length)
      return res.status(401).json({ message: 'Invalid credentials' })

    const row = result.rows[0]
    if (!verifyPassword(password, row.password_hash))
      return res.status(401).json({ message: 'Invalid credentials' })

    const user = sanitiseUser(row)
    res.json({ user, token: makeToken(user) })
  } catch (err) {
    console.error('[login]', err)
    res.status(500).json({ message: 'Server error' })
  }
})

// ---- Public profile ----
app.get('/api/users/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params
    const result = await pool.query(
      'SELECT id, public_id, name, surname, created_at FROM users WHERE public_id = $1',
      [publicId],
    )
    if (!result.rows.length)
      return res.status(404).json({ message: 'User not found' })

    const row = result.rows[0]
    res.json({
      user: {
        public_id: row.public_id,
        name: row.name,
        surname: row.surname,
        created_at: row.created_at,
      },
    })
  } catch (err) {
    console.error('[public-profile]', err)
    res.status(500).json({ message: 'Server error' })
  }
})

/* ───────── Start ───────── */
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`))
  })
  .catch((err) => {
    console.error('[db] init failed', err)
    process.exit(1)
  })
