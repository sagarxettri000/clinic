export interface Role {
  id: string
  name: string
  description: string | null
  isDefault: number
  createdAt: Date
  updatedAt: Date
}

export interface Permission {
  id: string
  module: string
  action: string
  description: string | null
  createdAt: Date
}

export interface RolePermission {
  id: string
  roleId: string
  permissionId: string
}

export interface User {
  id: string
  name: string
  email: string
  username: string
  passwordHash: string
  phone: string | null
  avatar: string | null
  status: string
  roleId: string | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Patient {
  id: string
  patientId: string
  name: string
  phone: string | null
  email: string | null
  dateOfBirth: Date | null
  gender: string | null
  address: string | null
  nationalId: string | null
  emergencyContact: string | null
  bloodGroup: string | null
  allergies: string | null
  medicalConditions: string | null
  currentMedications: string | null
  notes: string | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface Doctor {
  id: string
  name: string
  specialization: string | null
  phone: string | null
  email: string | null
  consultationFee: number
  revenueSharePercent: number
  signature: string | null
  profilePhoto: string | null
  notes: string | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface Appointment {
  id: string
  appointmentNumber: number
  patientId: string
  doctorId: string
  appointmentDate: Date
  appointmentTime: Date
  duration: number
  consultationFee: number
  doctorSharePercent: number
  status: string
  paymentStatus: string
  paymentMethod: string | null
  notes: string | null
  createdByUserId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AppointmentStatusHistory {
  id: string
  appointmentId: string
  fromStatus: string | null
  toStatus: string
  changedBy: string | null
  notes: string | null
  createdAt: Date
}

export interface Encounter {
  id: string
  patientId: string
  doctorId: string
  appointmentId: string | null
  followUpId: string | null
  encounterDate: Date
  chiefComplaint: string | null
  historyOfPresentIllness: string | null
  examinationFindings: string | null
  clinicalNotes: string | null
  followUpDate: Date | null
  additionalInstructions: string | null
  createdAt: Date
  updatedAt: Date
}

export interface VitalSign {
  id: string
  encounterId: string
  bloodPressureSystolic: number | null
  bloodPressureDiastolic: number | null
  pulse: number | null
  temperature: number | null
  respiratoryRate: number | null
  spo2: number | null
  weight: number | null
  height: number | null
  bmi: number | null
  createdAt: Date
}

export interface Diagnosis {
  id: string
  encounterId: string
  code: string | null
  description: string
  isPrimary: number
  createdAt: Date
}

export interface Treatment {
  id: string
  encounterId: string
  description: string
  notes: string | null
  createdAt: Date
}

export interface Prescription {
  id: string
  prescriptionNumber: string
  patientId: string
  doctorId: string
  encounterId: string | null
  followUpId: string | null
  prescriptionDate: Date
  diagnosis: string | null
  notes: string | null
  followUpDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PrescriptionItem {
  id: string
  prescriptionId: string
  medicineName: string
  strength: string | null
  dosage: string
  frequency: string
  duration: string | null
  route: string | null
  quantity: number | null
  instructions: string | null
  createdAt: Date
}

export interface Invoice {
  id: string
  invoiceNumber: string
  patientId: string
  appointmentId: string | null
  encounterId: string | null
  followUpId: string | null
  invoiceDate: Date
  dueDate: Date | null
  description: string | null
  paymentMethod: string | null
  subtotal: number
  discount: number
  taxPercent: number
  taxAmount: number
  totalAmount: number
  paidAmount: number
  balance: number
  status: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface InvoiceItem {
  id: string
  invoiceId: string
  serviceName: string
  description: string | null
  quantity: number
  unitPrice: number
  discount: number
  total: number
  createdAt: Date
}

export interface Payment {
  id: string
  paymentNumber: string
  patientId: string
  appointmentId: string | null
  invoiceId: string | null
  amount: number
  paymentDate: Date
  paymentMethod: string
  referenceNumber: string | null
  notes: string | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface Refund {
  id: string
  refundNumber: string
  paymentId: string
  patientId: string
  amount: number
  refundDate: Date
  reason: string
  refundMethod: string
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface Expense {
  id: string
  expenseNumber: string
  date: Date
  categoryId: string
  description: string
  amount: number
  paymentMethod: string
  supplier: string | null
  notes: string | null
  attachment: string | null
  createdById: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ExpenseCategory {
  id: string
  name: string
  description: string | null
  isActive: number
  createdAt: Date
}

export interface Account {
  id: string
  code: string
  name: string
  type: string
  description: string | null
  isActive: number
  createdAt: Date
}

export interface LedgerTransaction {
  id: string
  transactionNumber: string
  date: Date
  description: string
  debitAmount: number
  creditAmount: number
  balance: number
  accountId: string
  category: string | null
  patientId: string | null
  doctorId: string | null
  appointmentId: string | null
  invoiceId: string | null
  paymentId: string | null
  refundId: string | null
  expenseId: string | null
  referenceNumber: string | null
  notes: string | null
  userId: string | null
  createdAt: Date
}

export interface DoctorSettlement {
  id: string
  doctorId: string
  fromDate: Date
  toDate: Date
  totalConsultations: number
  grossRevenue: number
  discounts: number
  refunds: number
  doctorShare: number
  previouslyPaid: number
  currentPayable: number
  amountPaid: number
  remainingPayable: number
  paymentMethod: string | null
  referenceNumber: string | null
  notes: string | null
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface WhatsAppMessage {
  id: string
  patientId: string | null
  phoneNumber: string
  messageType: string
  templateName: string | null
  content: string
  status: string
  providerMessageId: string | null
  deliveredAt: Date | null
  errorMessage: string | null
  metadata: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  userId: string | null
  isRead: number
  metadata: string | null
  createdAt: Date
}

export interface Attachment {
  id: string
  patientId: string | null
  fileName: string
  filePath: string
  fileType: string
  fileSize: number
  uploadedById: string | null
  createdAt: Date
}

export interface ClinicSetting {
  id: string
  key: string
  value: string
  type: string
  group: string
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  userId: string | null
  action: string
  module: string
  recordId: string | null
  previousValues: string | null
  newValues: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID'
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'EASYPAY' | 'JAZZCASH' | 'OTHER'

export interface FollowUp {
  id: string
  followUpNumber: string
  patientId: string
  doctorId: string
  encounterId: string | null
  relatedPrescriptionId: string | null
  reason: string | null
  objective: string | null
  diagnosis: string | null
  clinicalNotes: string | null
  doctorInstructions: string | null
  outcome: string | null
  progress: string | null
  currentSymptoms: string | null
  examinationFindings: string | null
  diagnosisUpdate: string | null
  treatmentResponse: string | null
  medicationChanges: string | null
  doctorNotes: string | null
  nextAction: string | null
  nextActionDetails: string | null
  completedAt: Date | null
  createdById: string | null
  createdAt: Date
  updatedAt: Date
}

export type FollowUpStatus = 'OPEN' | 'COMPLETED'
