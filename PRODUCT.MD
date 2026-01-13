# FinTrack SaaS - Product Definition

## Core Architecture: Multi-Tenancy
- **Tenant Isolation**: Logic must ensure absolute data isolation. User A must NEVER see User B's data.
- **Model**: Shared Database, Row-Level Security (RLS) via `user_id` column on all entities.

## 1. Authentication & Onboarding
- **Registration Flow**: 
  - User signs up (Email + Password).
  - **Auto-Seeding**: Upon registration, system clones "System Default" categories/account-types into user-specific records.
- **Login**: JWT Session (90 days, HTTP-Only).

## 2. Entities with Defaults (Hybrid Model)
Users manage their own data, but start with industry standards.

### Logic "Copy-on-Write" for:
- **Transaction Categories** (e.g., Food, Transport).
- **Account Types** (e.g., Savings, Wallet).
- **Debt/Loan Types**.

**Behavior**:
1. System has a template list (hardcoded or meta-table).
2. When User X registers, copy these templates to the `categories` table with `user_id = X`.
3. User X can now rename/delete/add their own "Food" category without affecting User Y.

## 3. Core Domains (Updated)
### 2. Accounts (Ledger)
- **Types**: Cash, Debit, Credit, Bank, Savings, Investment.
- **Logic**: 
  - Balance is calculated in real-time based on transaction history.
  - Supports Soft Deletes (active/inactive flags).
  - Multi-currency support (Default: PEN).

### 3. Transactions (The Engine)
- **Types**: Income, Expense, Debt (Incurred), Debt Payment, Transfer, Goal Contribution, Loan (Given), Pending Payment.
- **Constraints**: 
  - Must belong to a Category and optional Subcategory.
  - Supports file attachments (R2 Storage).

### 4. Debts & Loans management
- **Debt (Owed by User)**: Tracks principal, interest rate, due dates.
  - Features: Installments (Cuotas) tracking.
- **Loans (Owed to User)**: Tracks borrower info, interest.
- **States**: Active, Paid, Overdue, Partial.

### 5. Goals & Recurring
- **Goals**: Target amount logic with auto-contribution calculation based on income %.
- **Recurring**: Scheduler for fixed expenses (Weekly/Monthly/Yearly).

### 6. Scheduled Payments (Pagos Programados)
Feature for organizing and tracking future payments that users need to make.

- **Purpose**: Helps users remember and plan for upcoming payments (bills, subscriptions, debt installments).
- **Types of Payments**:
  - **One-time**: Single payment with specific due date.
  - **Recurring**: Auto-creates next payment when marked as paid (weekly, biweekly, monthly, quarterly, yearly).
  - **Debt-linked**: Connected to specific debt/installment for tracking.

- **Status Flow**:
  - `pending` → Payment is upcoming.
  - `overdue` → Auto-marked when due date passes (background check on API access).
  - `paid` → Manually marked with optional transaction creation.
  - `cancelled` → User cancels the payment.

- **Priority Levels**: `low`, `medium`, `high`, `urgent` (for visual sorting/filtering).

- **Dashboard Integration**:
  - Shows upcoming payments for configurable days ahead.
  - Highlights overdue payments.
  - Summary of total due amount.

- **Automation Features**:
  - Auto-mark overdue on API access.
  - Auto-create transaction when marking as paid (if account is linked).
  - Auto-create next recurrence for recurring payments.
  - Bulk create from debt installments.

- **Reminder System**: `reminderDays` field for notification planning.

### 7. User Settings & Dashboard Configuration
- **Settings Stored Per User**: Theme, language, date format, notification preferences.
- **Dashboard Config (JSON)**: 
  - Periods for expense/income widgets.
  - Visible accounts for balance.
  - Widget order and visibility.
  - Scheduled payment days ahead.
- **Defaults Auto-Created**: On first access if not exists.

## User Experience (UX) Rules
- **Feedback**: Immediate Toast notifications on actions.
- **Performance**: Optimistic UI updates using React Query.