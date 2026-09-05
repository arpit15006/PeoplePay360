# PeoplePay360 — Integrated HR & Payroll Platform

PeoplePay360 is a full-featured, enterprise-grade HR and Payroll application designed for modern organizations. It faithfully implements an integrated, connected operational workflow:

$$\text{Employee} \longrightarrow \text{Contract} \longrightarrow \text{Attendance / Time Off} \longrightarrow \text{Salary Rules} \longrightarrow \text{Payrun} \longrightarrow \text{Payslip} \longrightarrow \text{PDF / Email} \longrightarrow \text{Dashboard}$$

---

## Key Highlights

- **5-Role Access Control (RBAC)**: Employee, HR Manager, HR Payroll User, HR Payroll Manager, and Admin with enforced permissions on both backend APIs and UI views.
- **Contract-Period Matching**: Automatic selection of the contract applicable to the specific payrun period (e.g., matching valid 2026 contract vs expired 2025 contract).
- **Sequential Salary Rules Engine**: Sequence-driven salary rules evaluation (Basic, HRA, Transport, Gross, PF, Tax, Net) factoring worked days and leaves.
- **2-Step Payrun Wizard**: Guided creation (Structure & Period $\rightarrow$ Employee selection) entering Draft state.
- **Real PDF Generation**: Native pixel-perfect PDF payslips generated via `@react-pdf/renderer` with direct download.
- **Bulk Payslip Email Workflow**: Distribution workflow with recipient selection and Nodemailer dispatch.
- **Real-Time WebSockets**: Live synchronization across tabs using Socket.IO for attendance, leaves, and payroll updates.
- **Dynamic Analytics Dashboard**: Live KPI cards, Recharts visualizations, and dynamic multi-dimensional filters.

---

## Repository Architecture

```text
PeoplePay360/
├── frontend/             # Vite + React + TypeScript + Vanilla CSS + TanStack Query + React-PDF
├── backend/              # Node.js + Express + TypeScript + Prisma + Neon PostgreSQL + Socket.IO
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm (v9+)
- Neon PostgreSQL connection string

### Backend Setup
```bash
cd backend
cp .env.example .env     # Configure your DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma generate
npx prisma db push       # Or npx prisma migrate dev
npm run seed             # Seed realistic demo data
npm run dev              # Start Express + Socket.IO server on port 5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev              # Start Vite dev server on port 5173
```
