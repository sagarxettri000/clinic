import { Client } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })

const DELETE_ORDER = [
  'LedgerTransaction',
  'InvoiceItem',
  'PrescriptionItem',
  'AppointmentStatusHistory',
  'VitalSign',
  'Diagnosis',
  'Treatment',
  'EncounterService',
  'AuditLog',
  'DoctorSettlement',
  'WhatsAppMessage',
  'Attachment',
  'StockMovement',
  'Notification',
  'Refund',
  'Payment',
  'Invoice',
  'Prescription',
  'FollowUp',
  'Encounter',
  'Appointment',
  'Expense',
  'Patient',
  'Doctor',
  'Medicine',
  'ExpenseCategory',
  'Account',
]

// Tables to KEEP: User (admin), Role, Permission, RolePermission, Service, ClinicSetting

async function main() {
  await client.connect()
  console.log('Connected to database\n')

  // Disable foreign key checks for cleanup
  await client.query('SET session_replication_role = replica')

  for (const table of DELETE_ORDER) {
    const res = await client.query(`DELETE FROM "${table}"`)
    console.log(`  ${table}: ${res.rowCount} rows deleted`)
  }

  // Re-enable foreign key checks
  await client.query('SET session_replication_role = origin')

  // Reset sequences for ID-based tables (if any use serial)
  const sequences = await client.query(`
    SELECT sequencename FROM pg_sequences
    WHERE schemaname = 'public'
  `)
  for (const row of sequences.rows) {
    await client.query(`ALTER SEQUENCE "${row.sequencename}" RESTART WITH 1`)
    console.log(`  Reset sequence: ${row.sequencename}`)
  }

  // Show final counts for all tables
  console.log('\n--- FINAL STATE ---')
  const allTables = [...DELETE_ORDER, 'User', 'Role', 'Permission', 'RolePermission', 'Service', 'ClinicSetting']
  for (const table of allTables) {
    const res = await client.query(`SELECT COUNT(*) as count FROM "${table}"`)
    console.log(`  ${table}: ${res.rows[0].count} rows`)
  }

  await client.end()
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
