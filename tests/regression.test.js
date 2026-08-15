const h = require('./harness')
const T = () => h.TOKEN()

async function main() {
  const l = await h.login()
  if (l.status !== 200) { h.fail('login', 200, l.status); process.exit(1) }
  h.pass('login')

  const checks = [
    ['/api/patients?page=1&limit=5', 'GET'],
    ['/api/doctors', 'GET'],
    ['/api/appointments?page=1&limit=5', 'GET'],
    ['/api/services', 'GET'],
    ['/api/invoices?page=1&limit=5', 'GET'],
    ['/api/accounts', 'GET'],
    ['/api/follow-ups?page=1&limit=5', 'GET'],
    ['/api/settings', 'GET'],
    ['/api/medicines?limit=5', 'GET'],
  ]

  let ok = 0
  let failed = false
  for (const [path, method] of checks) {
    const r = await h.req(path, method, null, T())
    const good = r.status === 200
    if (good) ok++
    else failed = true
    console.log((good ? 'PASS' : 'FAIL') + '  | ' + method + ' ' + path + ' -> ' + r.status)
  }
  console.log('---')
  console.log(ok + '/' + checks.length + ' endpoints OK')
  process.exit(failed ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
