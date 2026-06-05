# Super Admin Panel Documentation

## Overview

The Super Admin Panel is a separate highest-authority module for TradeFlux with strict hierarchy:

- Super Admin > Admin > User

This module is isolated under `/super-admin` and does not alter existing User Panel, Admin Panel, forecasting workflows, analytics pipelines, or business logic.

## Access

- URL: `/super-admin`
- Login URL: `/super-admin/login`
- Authentication: Supabase Auth session + `SuperAdminUser` table verification
- Authorization: Only active `SuperAdminUser` records are allowed

## Capabilities Implemented

- Full access to system analytics and dashboard overview
- Create, update, and remove Admin accounts
- Monitor user/admin/super-admin activities
- System-wide configuration control (`GlobalConfig`)
- Threshold policy management (`SystemThreshold`)
- Global notification controls + notification state updates
- View system logs and audit trails (agent/admin/super-admin)
- Enable/disable system modules (`SystemModule`)

## New Database Models

- `SuperAdminUser`
- `SuperAdminAuditLog`
- `SystemModule`
- `GlobalConfig`

These are additive and do not change existing table structures.

## API Routes

- `POST /api/super-admin/auth/signin`
- `POST /api/super-admin/auth/signout`
- `POST /api/super-admin/auth/verify`
- `GET /api/super-admin/dashboard`
- `GET|POST|PATCH|DELETE /api/super-admin/admins`
- `GET /api/super-admin/activities`
- `GET /api/super-admin/analytics`
- `GET|POST|PATCH|DELETE /api/super-admin/config`
- `GET|PATCH /api/super-admin/thresholds`
- `GET|PATCH /api/super-admin/notifications`
- `GET /api/super-admin/logs`
- `GET|PATCH /api/super-admin/modules`

## UI Routes

- `/super-admin` (dashboard)
- `/super-admin/admins`
- `/super-admin/activities`
- `/super-admin/analytics`
- `/super-admin/config`
- `/super-admin/thresholds`
- `/super-admin/notifications`
- `/super-admin/logs`
- `/super-admin/modules`

## Security Notes

- Super admin and admin auth contexts are separate (`superAdminAuthContext` vs `adminAuthContext`)
- Super-admin actions are logged to `SuperAdminAuditLog`
- Existing admin and user flows are unchanged

## Seeded Super Admin

The following super-admin record has been upserted into DB:

- Email: `arfanakram995@gmail.com`
- Name: `Arfan Akram`
- Role: `super_admin`
- Active: `true`

If this email does not yet exist in Supabase Auth users, create it in Supabase Authentication with the desired password, then login via `/super-admin/login`.
