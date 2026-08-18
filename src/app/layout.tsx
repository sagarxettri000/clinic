import type { Metadata } from "next"
import "./globals.css"
import { AppLayout } from "@/components/layout/app-layout"

export const metadata: Metadata = {
  title: "Swasthya-Clinic",
  description:
    "Manage Health, Care Better - A comprehensive clinic management system for managing patients, appointments, billing, and medical records.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full font-sans antialiased">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  )
}
