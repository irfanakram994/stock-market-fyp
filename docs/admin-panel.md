# Admin Panel Documentation

## Overview

The Admin Panel is a dedicated management interface for the TradeFlux AI-Powered Multi-Agent Forecasting System. It provides administrative control over the platform while maintaining complete separation from the user-facing interface.

## Access

- **URL**: `/admin` or `/admin/login`
- **Authentication**: Role-based authentication using Supabase Auth + AdminUser table
- Only users registered in the `AdminUser` database table can access the admin panel

## Features

### 1. Dashboard Overview
- **Route**: `/admin`
- Real-time statistics including:
  - Total users and new registrations
  - Total predictions with average confidence
  - Agent task statistics and success rates
  - Active stocks count
  - System health indicators
- Recent activity feed showing:
  - Latest agent logs
  - Recent predictions

### 2. User Management
- **Route**: `/admin/users`
- View all platform users with pagination
- Search users by name or email
- View user details including:
  - Registration date
  - Number of stocks tracked
  - Agent task count
- User actions (activate/deactivate with audit logging)

### 3. Prediction Monitoring
- **Route**: `/admin/predictions`
- View all predictions with filters:
  - Stock symbol
  - Trend (bullish/bearish/neutral)
  - Date range
- Statistics dashboard showing:
  - Average confidence
  - Trend distribution
- Detailed prediction data including confidence scores and price ranges

### 4. Threshold Management
- **Route**: `/admin/thresholds`
- Create, edit, and delete system thresholds
- Categories:
  - Prediction thresholds
  - Performance thresholds
  - Alert thresholds
- Configure min/max ranges and descriptions
- Enable/disable individual thresholds

### 5. Notification Management
- **Route**: `/admin/notifications`
- View all system notifications
- Filter by:
  - Type (alert, warning, info, success)
  - Category (system, user, prediction, performance)
  - Priority (critical, high, normal, low)
  - Read/unread status
- Mark notifications as read
- Delete notifications
- Create new notifications

### 6. System Analytics
- **Route**: `/admin/analytics`
- Time range selection (7, 30, or 90 days)
- Analytics visualizations:
  - Prediction trend distribution
  - Confidence distribution
  - Agent type distribution
  - Stock sector distribution
- Backtest performance summary
- Daily agent performance table

### 7. Audit Logs
- **Route**: `/admin/audit-logs`
- Complete audit trail of admin actions
- Filter by:
  - Action type
  - Target type
  - Date range
- View action details
- Top actions summary

## Database Models

The Admin Panel introduces the following new database models:

### AdminUser
```prisma
model AdminUser {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      String   @default("admin")
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lastLogin DateTime?
}
```

### SystemThreshold
```prisma
model SystemThreshold {
  id          String   @id @default(cuid())
  name        String   @unique
  category    String
  value       Float
  minValue    Float?
  maxValue    Float?
  description String?
  isActive    Boolean  @default(true)
}
```

### AdminNotification
```prisma
model AdminNotification {
  id       String  @id @default(cuid())
  type     String
  title    String
  message  String
  category String
  isRead   Boolean @default(false)
  priority String  @default("normal")
}
```

### AdminAuditLog
```prisma
model AdminAuditLog {
  id         String   @id @default(cuid())
  adminId    String
  action     String
  targetType String?
  targetId   String?
  details    Json?
  ipAddress  String?
  createdAt  DateTime @default(now())
}
```

### SystemAnalytics
```prisma
model SystemAnalytics {
  id               String   @id @default(cuid())
  date             DateTime @default(now())
  totalUsers       Int
  activeUsers      Int
  totalPredictions Int
  avgConfidence    Float?
}
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/auth/signin` | POST | Admin login |
| `/api/admin/auth/signout` | POST | Admin logout |
| `/api/admin/auth/verify` | POST | Verify admin status |
| `/api/admin/dashboard` | GET | Dashboard statistics |
| `/api/admin/users` | GET | List users |
| `/api/admin/users` | PATCH | Update user status |
| `/api/admin/predictions` | GET | List predictions |
| `/api/admin/thresholds` | GET, POST, PATCH, DELETE | Threshold CRUD |
| `/api/admin/notifications` | GET, POST, PATCH, DELETE | Notifications CRUD |
| `/api/admin/analytics` | GET | System analytics |
| `/api/admin/analytics` | POST | Create analytics snapshot |
| `/api/admin/audit-logs` | GET | View audit logs |

## Setting Up Admin Users

To create an admin user:

1. First, create a regular user account in Supabase Auth
2. Then, insert the user into the `AdminUser` table:

```sql
INSERT INTO "AdminUser" (id, email, name, role, "isActive", "createdAt", "updatedAt")
VALUES (
  'cuid_here',
  'admin@tradeflux.com',
  'Admin Name',
  'admin',
  true,
  NOW(),
  NOW()
);
```

Or using Prisma:

```typescript
await prisma.adminUser.create({
  data: {
    email: 'admin@tradeflux.com',
    name: 'Admin Name',
    role: 'admin',
    isActive: true,
  },
});
```

## Security Considerations

1. **Role-Based Access**: Only users in the `AdminUser` table can access admin features
2. **Session Verification**: Every API request verifies admin session
3. **Audit Logging**: All admin actions are logged with IP addresses
4. **Separate Interface**: Admin panel is completely isolated from user dashboard
5. **No Super Admin**: The system deliberately avoids super admin roles for security

## Design Decisions

- **Non-Destructive**: Existing database models and functionality remain unchanged
- **Backward Compatible**: All existing features continue to work normally
- **Separate Auth Context**: Admin authentication is isolated from user authentication
- **Comprehensive Logging**: All admin actions are tracked for accountability
