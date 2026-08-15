const http = require('http')

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3002'

function url(path) {
  return new URL(path, BASE_URL.endsWith('/') ? BASE_URL : BASE_URL + '/')
}

function req(path, method, body, token) {
  return new Promise((res, rej) => {
    const data = body ? JSON.stringify(body) : null
    const u = url(path)
    const r = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (resp) => {
      let d = ''
      resp.on('data', (c) => (d += c))
      resp.on('end', () => res({
        status: resp.statusCode,
        headers: resp.headers,
        body: d,
        json: () => { try { return JSON.parse(d) } catch (e) { return null } },
      }))
    })
    r.on('error', rej)
    if (data) r.write(data)
    r.end()
  })
}

let TOKEN = null

async function login(email = 'admin@clinic.com', password = 'admin123') {
  const r = await req('/api/auth/login', 'POST', { email, password })
  const j = r.json()
  const sc = r.headers && r.headers['set-cookie']
  const raw = (Array.isArray(sc) ? sc[0] : sc) || ''
  const m = raw.match(/clinic-auth-token=([^;]+)/)
  if (m) TOKEN = m[1]
  return { status: r.status, json: j }
}

function pass(label, detail) { console.log('PASS  | ' + label + (detail ? ' | ' + detail : '')) }
function fail(label, expected, actual) { console.log('FAIL  | ' + label + ' | expected: ' + JSON.stringify(expected) + ' | actual: ' + JSON.stringify(actual)) }
function info(label, detail) { console.log('INFO  | ' + label + ' | ' + detail) }

module.exports = { req, login, TOKEN: () => TOKEN, pass, fail, info, BASE_URL }
