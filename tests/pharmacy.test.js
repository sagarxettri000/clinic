const h = require('./harness')
const T = () => h.TOKEN()

let failed = false
function check(cond, label, expected, actual) {
  if (cond) h.pass(label)
  else { h.fail(label, expected, actual); failed = true }
}

async function main() {
  const l = await h.login()
  if (l.status !== 200) { h.fail('login', 200, l.status); process.exit(1) }
  h.pass('login')

  const name = 'Paracetamol ' + Date.now()

  // 1. Create medicine
  const created = await h.req('/api/medicines', 'POST', {
    name,
    genericName: 'Acetaminophen',
    category: 'Analgesic',
    brand: 'TestPharma',
    strength: '500mg',
    unit: 'TABLET',
    purchasePrice: 5,
    sellingPrice: 10,
    stockQuantity: 50,
    reorderLevel: 10,
    batchNumber: 'B-TEST-1',
    expiryDate: '2027-12-31',
    supplier: 'Nepal Pharma',
    location: 'Shelf A1',
    notes: 'test medicine',
  }, T())
  if (created.status !== 201) { h.fail('create medicine', 201, created.status + ' ' + created.body); process.exit(1) }
  const med = created.json()
  h.pass('create medicine', med.name + ' id=' + med.id.slice(0, 8))

  // 2. Duplicate should 409
  const dup = await h.req('/api/medicines', 'POST', { name, strength: '500mg', brand: 'TestPharma' }, T())
  check(dup.status === 409, 'duplicate medicine blocked', 409, dup.status)

  // 3. Search finds medicine
  const list = await h.req('/api/medicines?search=' + encodeURIComponent(name.slice(0, 12)), 'GET', null, T())
  const listJson = list.json()
  check(list.status === 200 && listJson.medicines.some((m) => m.id === med.id),
    'search finds medicine', '200 + match', list.status + ' ' + list.body)

  // 4. GET single
  const single = await h.req('/api/medicines/' + med.id, 'GET', null, T())
  check(single.status === 200 && single.json().id === med.id, 'get single', 200, single.status)

  // 5. Stock IN
  const inr = await h.req('/api/medicines/' + med.id + '/stock', 'POST', { type: 'STOCK_IN', quantity: 30, notes: 'restock' }, T())
  if (inr.status !== 201) { h.fail('stock in', 201, inr.status + ' ' + inr.body); process.exit(1) }
  const inj = inr.json()
  check(inj.medicine.stockQuantity === 80 && inj.movement.previousStock === 50 && inj.movement.newStock === 80,
    'stock in math', '80/50/80', JSON.stringify({ s: inj.medicine.stockQuantity, p: inj.movement.previousStock, n: inj.movement.newStock }))

  // 6. Stock OUT
  const outr = await h.req('/api/medicines/' + med.id + '/stock', 'POST', { type: 'STOCK_OUT', quantity: 15, notes: 'dispensed' }, T())
  if (outr.status !== 201) { h.fail('stock out', 201, outr.status + ' ' + outr.body); process.exit(1) }
  const outj = outr.json()
  check(outj.medicine.stockQuantity === 65, 'stock out math', 65, outj.medicine.stockQuantity)

  // 7. Insufficient stock OUT should 400
  const bad = await h.req('/api/medicines/' + med.id + '/stock', 'POST', { type: 'STOCK_OUT', quantity: 9999 }, T())
  check(bad.status === 400, 'insufficient stock blocked', 400, bad.status)

  // 8. Movement history
  const single2 = await h.req('/api/medicines/' + med.id, 'GET', null, T())
  check(single2.json().movements.length >= 3, 'movement history', '>=3', single2.json().movements.length)

  // 9. Update medicine
  const upd = await h.req('/api/medicines/' + med.id, 'PUT', { sellingPrice: 12.5, reorderLevel: 5 }, T())
  check(upd.status === 200 && upd.json().sellingPrice === 12.5 && upd.json().reorderLevel === 5,
    'update medicine', '200 + values', upd.status + ' ' + upd.body)

  // 10. Validation: negative stock
  const inv = await h.req('/api/medicines', 'POST', { name: 'Bad ' + Date.now(), stockQuantity: -5 }, T())
  check(inv.status === 400, 'validation on negative stock', 400, inv.status)

  // 11. DELETE (deactivate)
  const del = await h.req('/api/medicines/' + med.id, 'DELETE', null, T())
  check(del.status === 200, 'delete (deactivate)', 200, del.status)

  // 12. Gone from active list
  const after = await h.req('/api/medicines?search=' + encodeURIComponent(name.slice(0, 12)), 'GET', null, T())
  const stillThere = after.json().medicines.some((m) => m.id === med.id)
  check(!stillThere, 'deactivated medicine hidden', 'not present', 'present')

  // 13. Anonymous blocked
  const anon = await h.req('/api/medicines', 'GET')
  check(anon.status === 401, 'anonymous blocked', 401, anon.status)

  // 14. Cleanup test medicines
  const cleanup = await h.req('/api/medicines?search=Paracetamol', 'GET', null, T())
  for (const m of cleanup.json().medicines || []) {
    if (m.isActive === 1) { await h.req('/api/medicines/' + m.id, 'DELETE', null, T()) }
  }
  h.info('cleanup', 'test medicines deactivated')

  process.exit(failed ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
