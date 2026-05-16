// Thin wrapper around the auth endpoints exposed by index.js.
// All requests go through Vite's /api proxy → http://localhost:4000.

const jsonHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(body),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    // ignore — server might not return JSON on error
  }

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export const sendVerificationCode = (email) =>
  postJson('/api/auth/send-code', { email })

export const registerUser = ({
  name,
  surname,
  email,
  password,
  verificationCode,
  invitationCode,
}) =>
  postJson('/api/auth/register', {
    name,
    surname,
    email,
    password,
    verificationCode,
    invitationCode: invitationCode || undefined,
  })

export const loginUser = ({ email, password }) =>
  postJson('/api/auth/login', { email, password })
