# DeployDash — Local Setup

  ## Prerequisites
  - Node.js 18+ (https://nodejs.org)
  - pnpm  →  run: npm install -g pnpm

  ## Quick Start

  ```bash
  cd deploydash
  pnpm install
  pnpm run dev
  ```

  Then open http://localhost:5173 in your browser.

  ## Default credentials
  Admin panel login:
    User ID:  admin
    Password: admin123

  ## Stack
  - React 18 + Vite 6
  - TypeScript
  - Tailwind CSS v4
  - shadcn/ui components
  - All data stored in browser localStorage (no backend needed)

  ## Features
  - RBAC: Admin / Developer / Viewer roles
  - Unique Run IDs per deployment (RUN-YYYY-NNNN)
  - Per-item checklist notes & error logs
  - Deployment locking — completed/failed records are immutable
  - Immutable audit log (Admin Panel → Audit Log)
  - Admin panel: user role management, checklist templates, developer assignments
  