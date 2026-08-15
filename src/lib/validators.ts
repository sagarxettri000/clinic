import { z } from 'zod'

const znull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === null ? undefined : v), schema)

export const patientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: znull(z.string().optional()),
  email: znull(z.string().email('Invalid email').or(z.literal('')).optional()),
  dateOfBirth: znull(z.string().optional()),
  gender: znull(z.string().optional()),
  address: znull(z.string().optional()),
  nationalId: znull(z.string().optional()),
  emergencyContact: znull(z.string().optional()),
  bloodGroup: znull(z.string().optional()),
  allergies: znull(z.string().optional()),
  medicalConditions: znull(z.string().optional()),
  currentMedications: znull(z.string().optional()),
  notes: znull(z.string().optional()),
  status: znull(z.string().default('ACTIVE')),
})

export const doctorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  specialization: znull(z.string().optional()),
  phone: znull(z.string().optional()),
  email: znull(z.string().email('Invalid email').or(z.literal('')).optional()),
  consultationFee: znull(z.number().min(0, 'Consultation fee cannot be negative').default(0)),
  revenueSharePercent: znull(
    z
      .number()
      .min(0, 'Revenue share cannot be negative')
      .max(100, 'Revenue share cannot exceed 100')
      .default(40)
  ),
  signature: znull(z.string().optional()),
  profilePhoto: znull(z.string().optional()),
  notes: znull(z.string().optional()),
  status: znull(z.string().default('ACTIVE')),
})

export const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  appointmentDate: z.string().min(1, 'Appointment date is required'),
  appointmentTime: z.string().min(1, 'Appointment time is required'),
  duration: znull(z.number().min(1, 'Duration must be at least 1 minute').default(30)),
  consultationFee: znull(
    z.number().min(0, 'Consultation fee cannot be negative').optional()
  ),
  doctorSharePercent: znull(
    z
      .number()
      .min(0, 'Doctor share cannot be negative')
      .max(100, 'Doctor share cannot exceed 100')
      .optional()
  ),
  notes: znull(z.string().optional()),
  paymentMethod: znull(z.string().optional()),
})

export const encounterSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  appointmentId: znull(z.string().optional()),
  followUpId: znull(z.string().optional()),
  status: znull(z.string().optional()),
  chiefComplaint: znull(z.string().optional()),
  historyOfPresentIllness: znull(z.string().optional()),
  examinationFindings: znull(z.string().optional()),
  clinicalNotes: znull(z.string().optional()),
  followUpDate: znull(z.string().optional()),
  additionalInstructions: znull(z.string().optional()),
  vitalSigns: znull(
    z
      .object({
        bloodPressureSystolic: znull(z.number().min(0).optional()),
        bloodPressureDiastolic: znull(z.number().min(0).optional()),
        bloodPressure: znull(z.string().optional()),
        pulse: znull(z.number().min(0).optional()),
        temperature: znull(z.number().min(0).optional()),
        respiratoryRate: znull(z.number().min(0).optional()),
        spo2: znull(z.number().min(0).max(100).optional()),
        weight: znull(z.number().min(0).optional()),
        height: znull(z.number().min(0).optional()),
      })
      .optional()
  ),
  diagnoses: znull(
    z
      .array(
        z.object({
          code: znull(z.string().optional()),
          description: z.string().min(1, 'Description is required'),
          isPrimary: znull(z.number().default(0)),
        })
      )
      .optional()
  ),
  treatments: znull(
    z
      .array(
        z.object({
          description: z.string().min(1, 'Description is required'),
          notes: znull(z.string().optional()),
        })
      )
      .optional()
  ),
  services: znull(
    z
      .array(
        z.object({
          serviceId: z.string().min(1, 'Service is required'),
          quantity: znull(z.number().min(1, 'Quantity must be at least 1')).default(1),
          notes: znull(z.string()).optional(),
        })
      )
      .optional()
  ),
})

export const prescriptionItemSchema = z.object({
  medicineName: z.string().min(1, 'Medicine name is required'),
  strength: znull(z.string().optional()),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: znull(z.string().optional()),
  route: znull(z.string().optional()),
  quantity: znull(z.number().min(0, 'Quantity cannot be negative').optional()),
  instructions: znull(z.string().optional()),
})

export const prescriptionSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  encounterId: znull(z.string().optional()),
  followUpId: znull(z.string().optional()),
  diagnosis: znull(z.string().optional()),
  notes: znull(z.string().optional()),
  followUpDate: znull(z.string().optional()),
  items: z
    .array(prescriptionItemSchema)
    .min(1, 'At least one prescription item is required'),
})

export const invoiceItemSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required'),
  description: znull(z.string().optional()),
  quantity: znull(z.number().int().min(1).default(1)),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  discount: znull(z.number().min(0).default(0)),
})

export const invoiceSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  appointmentId: znull(z.string().optional()),
  encounterId: znull(z.string().optional()),
  followUpId: znull(z.string().optional()),
  paymentMethod: znull(z.string().optional()),
  description: znull(z.string().optional()),
  status: znull(z.string().optional()),
  subtotal: znull(z.number().default(0)),
  discount: znull(z.number().min(0).default(0)),
  taxPercent: znull(z.number().min(0).max(100).default(0)),
  taxAmount: znull(z.number().default(0)),
  totalAmount: znull(z.number().default(0)),
  paidAmount: znull(z.number().min(0).default(0)),
  balance: znull(z.number().default(0)),
  notes: znull(z.string().optional()),
  items: z.array(invoiceItemSchema).default([]),
})

export const paymentSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  appointmentId: znull(z.string().optional()),
  invoiceId: znull(z.string().optional()),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  referenceNumber: znull(z.string().optional()),
  notes: znull(z.string().optional()),
})

export const refundSchema = z.object({
  paymentId: z.string().min(1, 'Payment is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  reason: z.string().min(1, 'Reason is required'),
  refundMethod: z.string().min(1, 'Refund method is required'),
  patientId: znull(z.string().optional()),
})

export const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  supplier: znull(z.string().optional()),
  notes: znull(z.string().optional()),
  date: znull(z.string().optional()),
})

export const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: znull(z.string().optional()),
  roleId: znull(z.string().optional()),
  status: znull(z.string().default('ACTIVE')),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

export const followUpSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  doctorId: z.string().min(1, 'Doctor is required'),
  encounterId: znull(z.string().optional()),
  relatedPrescriptionId: znull(z.string().optional()),
  reason: znull(z.string().optional()),
  objective: znull(z.string().optional()),
  diagnosis: znull(z.string().optional()),
  clinicalNotes: znull(z.string().optional()),
  doctorInstructions: znull(z.string().optional()),
})

export const followUpCompleteSchema = z.object({
  outcome: z.string().min(1, 'Outcome is required'),
  progress: znull(z.string().optional()),
  currentSymptoms: znull(z.string().optional()),
  examinationFindings: znull(z.string().optional()),
  diagnosisUpdate: znull(z.string().optional()),
  treatmentResponse: znull(z.string().optional()),
  medicationChanges: znull(z.string().optional()),
  doctorNotes: znull(z.string().optional()),
  nextAction: znull(z.string().optional()),
  nextActionDetails: znull(z.string().optional()),
})

export const medicineSchema = z.object({
  name: z.string().min(1, 'Medicine name is required'),
  genericName: znull(z.string().optional()),
  category: znull(z.string().optional()),
  brand: znull(z.string().optional()),
  strength: znull(z.string().optional()),
  unit: znull(z.string().default('TABLET')),
  purchasePrice: znull(
    z.number().min(0, 'Purchase price cannot be negative').default(0)
  ),
  sellingPrice: znull(
    z.number().min(0, 'Selling price cannot be negative').default(0)
  ),
  stockQuantity: znull(
    z.number().int().min(0, 'Stock cannot be negative').default(0)
  ),
  reorderLevel: znull(
    z.number().int().min(0, 'Reorder level cannot be negative').default(10)
  ),
  batchNumber: znull(z.string().optional()),
  expiryDate: znull(z.string().optional()),
  supplier: znull(z.string().optional()),
  location: znull(z.string().optional()),
  notes: znull(z.string().optional()),
  isActive: znull(z.number().default(1)),
})

export const stockMovementSchema = z.object({
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT']),
  quantity: z.number().int().positive('Quantity must be a positive number'),
  notes: znull(z.string().optional()),
  referenceNumber: znull(z.string().optional()),
})

export type PatientInput = z.infer<typeof patientSchema>
export type DoctorInput = z.infer<typeof doctorSchema>
export type AppointmentInput = z.infer<typeof appointmentSchema>
export type EncounterInput = z.infer<typeof encounterSchema>
export type PrescriptionInput = z.infer<typeof prescriptionSchema>
export type InvoiceInput = z.infer<typeof invoiceSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type RefundInput = z.infer<typeof refundSchema>
export type ExpenseInput = z.infer<typeof expenseSchema>
export type UserInput = z.infer<typeof userSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type FollowUpInput = z.infer<typeof followUpSchema>
export type FollowUpCompleteInput = z.infer<typeof followUpCompleteSchema>
export type MedicineInput = z.infer<typeof medicineSchema>
export type StockMovementInput = z.infer<typeof stockMovementSchema>
