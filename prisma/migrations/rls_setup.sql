-- Enable Row Level Security (RLS) on all sensitive tables
-- Run this in Supabase SQL editor

-- Enable RLS on sensitive tables
ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Doctor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "InvoiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Prescription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PrescriptionItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Medicine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "StockMovement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Encounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "EncounterService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Diagnosis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Treatment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "VitalSign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "FollowUp" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "DoctorSettlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Refund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Expense" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "LedgerTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Attachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "AppointmentStatusHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ExpenseCategory" ENABLE ROW LEVEL SECURITY;

-- Create policies: allow postgres superuser full access
-- (Prisma uses the postgres user, so this ensures the app still works)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'User', 'Patient', 'Doctor', 'Appointment', 'Invoice', 'InvoiceItem',
    'Payment', 'Prescription', 'PrescriptionItem', 'Medicine', 'StockMovement',
    'Encounter', 'EncounterService', 'Diagnosis', 'Treatment', 'VitalSign',
    'FollowUp', 'AuditLog', 'DoctorSettlement', 'Refund', 'Expense',
    'LedgerTransaction', 'Account', 'Service'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS postgres_full_access ON "%I"', t);
    EXECUTE format('CREATE POLICY postgres_full_access ON "%I" FOR ALL TO postgres USING (true) WITH CHECK (true)', t);
    RAISE NOTICE 'Policy created: %', t;
  END LOOP;
END $$;
