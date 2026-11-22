# VVITU Student Certificate Management System

A full-stack, role-based web application for **Vasireddy Venkatadri International Technological University (VVITU)** enabling digital certificate requests, administrative verification, automated A4 Landscape PDF issuance, and public QR-code authenticity verification.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend & Database:** Supabase (PostgreSQL 15, Row Level Security, Supabase Auth, Private Storage)
- **Document & Data Engine:** SheetJS (`xlsx`) for validated cohort imports, `pdf-lib` for A4 Landscape PDF generation, `qrcode` for dynamic verification URLs
- **Deployment:** Vercel (HTTPS)

## Portals
1. **Administrator Portal (`/admin`):** Cohort metrics, validated `CAD.xlsx` importer (`CAD-1` to `CAD-4`), student directory, configurable certificate templates, request approval/rejection, PDF issuance, revocation/reissue, and immutable audit logs.
2. **Student Portal (`/student`):** Roll Number + Hall Ticket first-time activation, verified academic profile, dynamic certificate request submission, real-time status tracking, and signed-URL PDF downloads.
3. **Public Verification Portal (`/verify/:token`):** Unauthenticated QR/reference lookup verifying active, revoked, or replaced certificates directly against PostgreSQL.
