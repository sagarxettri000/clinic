import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { hashPassword, getUserIdFromRequest } from '@/lib/auth'

const permissions = [
  { module: 'patients', action: 'view' },
  { module: 'patients', action: 'create' },
  { module: 'patients', action: 'edit' },
  { module: 'patients', action: 'delete' },
  { module: 'appointments', action: 'view' },
  { module: 'appointments', action: 'create' },
  { module: 'appointments', action: 'edit' },
  { module: 'appointments', action: 'delete' },
  { module: 'encounters', action: 'view' },
  { module: 'encounters', action: 'create' },
  { module: 'encounters', action: 'edit' },
  { module: 'encounters', action: 'delete' },
  { module: 'prescriptions', action: 'view' },
  { module: 'prescriptions', action: 'create' },
  { module: 'prescriptions', action: 'edit' },
  { module: 'prescriptions', action: 'delete' },
  { module: 'invoices', action: 'view' },
  { module: 'invoices', action: 'create' },
  { module: 'invoices', action: 'edit' },
  { module: 'invoices', action: 'delete' },
  { module: 'payments', action: 'view' },
  { module: 'payments', action: 'create' },
  { module: 'payments', action: 'edit' },
  { module: 'payments', action: 'delete' },
  { module: 'expenses', action: 'view' },
  { module: 'expenses', action: 'create' },
  { module: 'expenses', action: 'edit' },
  { module: 'expenses', action: 'delete' },
  { module: 'reports', action: 'view' },
  { module: 'reports', action: 'export' },
  { module: 'users', action: 'view' },
  { module: 'users', action: 'create' },
  { module: 'users', action: 'edit' },
  { module: 'users', action: 'delete' },
  { module: 'settings', action: 'view' },
  { module: 'settings', action: 'edit' },
  { module: 'doctors', action: 'view' },
  { module: 'doctors', action: 'create' },
  { module: 'doctors', action: 'edit' },
  { module: 'doctors', action: 'delete' },
  { module: 'settlements', action: 'view' },
  { module: 'settlements', action: 'create' },
  { module: 'settlements', action: 'edit' },
  { module: 'followups', action: 'view' },
  { module: 'followups', action: 'create' },
  { module: 'followups', action: 'edit' },
  { module: 'followups', action: 'delete' },
  { module: 'accounts', action: 'view' },
  { module: 'accounts', action: 'create' },
  { module: 'accounts', action: 'edit' },
  { module: 'accounts', action: 'delete' },
  { module: 'whatsapp', action: 'view' },
  { module: 'whatsapp', action: 'create' },
  { module: 'notifications', action: 'view' },
  { module: 'notifications', action: 'edit' },
  { module: 'services', action: 'view' },
  { module: 'services', action: 'create' },
  { module: 'services', action: 'edit' },
  { module: 'services', action: 'delete' },
]

const roles = [
  { name: 'Super Admin', description: 'Full system access', isDefault: 0 },
  { name: 'Clinic Admin', description: 'Clinic management access', isDefault: 0 },
  { name: 'Doctor', description: 'Doctor access', isDefault: 0 },
  { name: 'Receptionist', description: 'Front desk access', isDefault: 0 },
  { name: 'Accountant', description: 'Financial management access', isDefault: 0 },
]

const expenseCategories = [
  { name: 'Rent', description: 'Office/clinic rent' },
  { name: 'Utilities', description: 'Electricity, water, gas, internet' },
  { name: 'Medical supplies', description: 'Medical equipment and consumables' },
  { name: 'Salaries', description: 'Staff salaries' },
  { name: 'Maintenance', description: 'Building and equipment maintenance' },
  { name: 'Marketing', description: 'Advertising and promotional expenses' },
  { name: 'Office expenses', description: 'Office supplies and stationery' },
  { name: 'Other', description: 'Miscellaneous expenses' },
]

const services = [
  { name: 'Complete Blood Count (CBC)', category: 'Laboratory', price: 1200 },
  { name: 'Blood Sugar (Random)', category: 'Laboratory', price: 400 },
  { name: 'Blood Sugar (Fasting)', category: 'Laboratory', price: 400 },
  { name: 'Lipid Profile', category: 'Laboratory', price: 1800 },
  { name: 'Liver Function Test', category: 'Laboratory', price: 2000 },
  { name: 'Kidney Function Test', category: 'Laboratory', price: 1500 },
  { name: 'Thyroid Profile', category: 'Laboratory', price: 2500 },
  { name: 'Urine Analysis', category: 'Laboratory', price: 500 },
  { name: 'X-Ray Chest', category: 'Radiology', price: 1500 },
  { name: 'X-Ray Limb', category: 'Radiology', price: 1200 },
  { name: 'Ultrasound Abdomen', category: 'Radiology', price: 3000 },
  { name: 'ECG', category: 'Diagnostics', price: 800 },
  { name: 'Nebulization', category: 'Treatment', price: 500 },
  { name: 'Dressing', category: 'Treatment', price: 600 },
  { name: 'Injection', category: 'Treatment', price: 300 },
  { name: 'IV Drip', category: 'Treatment', price: 1000 },
  { name: 'COVID-19 Rapid Test', category: 'Laboratory', price: 1500 },
  { name: 'Dengue Antigen Test', category: 'Laboratory', price: 2500 },
]

const accounts = [
  { code: '1001', name: 'Cash', type: 'ASSET', description: 'Cash on hand' },
  { code: '1002', name: 'Bank', type: 'ASSET', description: 'Bank account' },
  { code: '1003', name: 'Accounts Receivable', type: 'ASSET', description: 'Amounts owed by patients' },
  { code: '4001', name: 'Consultation Income', type: 'INCOME', description: 'Revenue from consultations' },
  { code: '5001', name: 'Expense Account', type: 'EXPENSE', description: 'General expense account' },
]

const defaultSettings = [
  { key: 'clinic_name', value: 'My Clinic', type: 'STRING', group: 'general' },
  { key: 'clinic_phone', value: '+977-1-5551234', type: 'STRING', group: 'contact' },
  { key: 'clinic_email', value: 'info@clinic.com', type: 'STRING', group: 'contact' },
  { key: 'clinic_address', value: 'Baneshwor, Kathmandu', type: 'STRING', group: 'contact' },
  { key: 'currency', value: 'NPR', type: 'STRING', group: 'billing' },
  { key: 'tax_rate', value: '0', type: 'NUMBER', group: 'billing' },
  { key: 'appointment_duration', value: '30', type: 'NUMBER', group: 'appointments' },
  { key: 'timezone', value: 'Asia/Kathmandu', type: 'STRING', group: 'general' },
]

export async function POST(request: NextRequest) {
  try {
    const seedingUserId = await getUserIdFromRequest(request)
    if (!seedingUserId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const seedingUser = await prisma.user.findUnique({
      where: { id: seedingUserId },
      include: { role: true },
    })
    if (
      !seedingUser ||
      seedingUser.status !== 'ACTIVE' ||
      seedingUser.role?.name !== 'Super Admin'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (
      process.env.NODE_ENV === 'production' &&
      process.env.ALLOW_SEED !== 'true'
    ) {
      return NextResponse.json(
        { success: false, error: 'Seeding is disabled in production' },
        { status: 403 }
      )
    }
    const createdPermissions = await prisma.$transaction(
      permissions.map((p) =>
        prisma.permission.upsert({
          where: { module_action: { module: p.module, action: p.action } },
          update: {},
          create: p,
        })
      )
    )

    const createdRoles = await prisma.$transaction(
      roles.map((r) =>
        prisma.role.upsert({
          where: { name: r.name },
          update: {},
          create: r,
        })
      )
    )

    const superAdminRole = createdRoles.find((r) => r.name === 'Super Admin')
    if (superAdminRole) {
      await prisma.$transaction(
        createdPermissions.map((p) =>
          prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: superAdminRole.id,
                permissionId: p.id,
              },
            },
            update: {},
            create: {
              roleId: superAdminRole.id,
              permissionId: p.id,
            },
          })
        )
      )
    }

    const adminPasswordHash = await hashPassword('admin123')
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@clinic.com' },
      update: {},
      create: {
        name: 'Admin',
        email: 'admin@clinic.com',
        username: 'admin',
        passwordHash: adminPasswordHash,
        roleId: superAdminRole?.id,
        status: 'ACTIVE',
      },
    })

    const doctorRole = createdRoles.find((r) => r.name === 'Doctor')

    const drFaisal = await prisma.doctor.upsert({
      where: { id: 'doc-faisal-amir' },
      update: {},
      create: {
        id: 'doc-faisal-amir',
        name: 'Dr. Faisal Amir',
        specialization: 'General Physician',
        consultationFee: 2000,
        revenueSharePercent: 40,
        status: 'ACTIVE',
      },
    })

    const drDemo = await prisma.doctor.upsert({
      where: { id: 'doc-demo-doctor' },
      update: {},
      create: {
        id: 'doc-demo-doctor',
        name: 'Dr. Demo Doctor',
        specialization: 'Dentist',
        consultationFee: 1500,
        revenueSharePercent: 40,
        status: 'ACTIVE',
      },
    })

    let counter = 1
    const patientData = [
      { name: 'Ali Khan', phone: '+92-300-1111111', gender: 'Male' },
      { name: 'Usman', phone: '+92-300-2222222', gender: 'Male' },
      { name: 'Irfan Tariq', phone: '+92-300-3333333', gender: 'Male' },
    ]

    const patients = await Promise.all(
      patientData.map(async (p) => {
        const pid = `PAT-${String(counter++).padStart(4, '0')}`
        return prisma.patient.upsert({
          where: { patientId: pid },
          update: {},
          create: {
            patientId: pid,
            name: p.name,
            phone: p.phone,
            gender: p.gender,
            status: 'ACTIVE',
          },
        })
      })
    )

    await prisma.$transaction(
      expenseCategories.map((c) =>
        prisma.expenseCategory.upsert({
          where: { name: c.name },
          update: {},
          create: c,
        })
      )
    )

    await prisma.$transaction(
      services.map((s) =>
        prisma.service.upsert({
          where: { name: s.name },
          update: { category: s.category, price: s.price, isActive: 1 },
          create: s,
        })
      )
    )

    await prisma.$transaction(
      accounts.map((a) =>
        prisma.account.upsert({
          where: { code: a.code },
          update: {},
          create: a,
        })
      )
    )

    await prisma.$transaction(
      defaultSettings.map((s) =>
        prisma.clinicSetting.upsert({
          where: { key: s.key },
          update: {},
          create: s,
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      data: {
        permissions: createdPermissions.length,
        roles: createdRoles.length,
        users: 1,
        doctors: 2,
        patients: patients.length,
        expenseCategories: expenseCategories.length,
        accounts: accounts.length,
        settings: defaultSettings.length,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { success: false, error: 'Database seed failed' },
      { status: 500 }
    )
  }
}
