# Authentication System - TradeFlux

## Complete Setup

This document covers the full implementation of user authentication with Supabase and Prisma.

## Architecture

```
┌─────────────────────────────────────┐
│        Frontend (Next.js/React)     │
│  ├─ AuthModal Component             │
│  ├─ useAuth() Hook                  │
│  └─ ProtectedRoute Wrapper          │
└────────────────┬────────────────────┘
                 │
         ┌───────▼───────┐
         │  API Routes   │
         ├─ /api/auth/signup
         ├─ /api/auth/signin
         └─ /api/auth/signout
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼────────┐       ┌───────▼──────┐
│ Supabase   │       │  Prisma/     │
│ Auth       │       │  PostgreSQL  │
│            │       │  (User DB)   │
└────────────┘       └──────────────┘
```

## Files Created/Modified

### Core Files

#### 1. **lib/supabaseClient.ts** (NEW)
Initializes Supabase client
```typescript
const supabase = createClient(supabaseUrl, supabaseAnonKey);
```
- Uses public environment variables

#### 2. **lib/auth.ts** (NEW)
Authentication business logic:
- `signUp()` - Register new user
- `signIn()` - Login user
- `signOut()` - Logout user
- `getCurrentUser()` - Get current session user

#### 3. **lib/authContext.tsx** (NEW)
React Context for authentication state:
- Provides `user`, `loading`, `signOut()`, `refreshUser()`
- Listens to Supabase auth state changes
- Global state management

### API Routes

#### 4. **app/api/auth/signup/route.ts** (NEW)
- POST endpoint for registration
- Validates: email, password length, password match
- Creates user in Supabase Auth + Prisma DB
- Returns user data or error

#### 5. **app/api/auth/signin/route.ts** (NEW)
- POST endpoint for login
- Validates: email, password
- Authenticates with Supabase
- Returns user data or error

#### 6. **app/api/auth/signout/route.ts** (NEW)
- POST endpoint for logout
- Signs out from Supabase
- Clears session

### Components

#### 7. **components/LayoutWrapper.tsx** (NEW)
Client wrapper for authentication context
- Provides `AuthProvider` to entire app

#### 8. **components/ProtectedRoute.tsx** (NEW)
Protected route component:
- Redirects unauthenticated users to home
- Shows loading state during auth check
- Only renders content if user logged in

#### 9. **components/AuthModal.tsx** (UPDATED)
- Integrated with real API endpoints
- Added loading states
- Added error handling
- Form validation

#### 10. **app/layout.tsx** (UPDATED)
- Added `LayoutWrapper` to provide auth context

## Environment Setup

Required variables in `.env.local`:
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Database (from Supabase)
DATABASE_URL=postgresql://user:password@db.supabase.co:5432/postgres
```

## Database Schema

User data stored in Prisma's `User` model:
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  stocks    Stock[]
  agentLogs AgentLog[]
}
```

## Usage Examples

### Example 1: Access User in Component
```typescript
'use client';
import { useAuth } from '@/lib/authContext';

export default function Profile() {
  const { user, loading, signOut } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {user ? (
        <>
          <h1>Welcome {user.name}</h1>
          <p>Email: {user.email}</p>
          <button onClick={signOut}>Sign Out</button>
        </>
      ) : (
        <p>Not logged in</p>
      )}
    </div>
  );
}
```

### Example 2: Protect a Route
```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <div>Dashboard - Only visible when logged in</div>
    </ProtectedRoute>
  );
}
```

### Example 3: Make Authenticated API Call
```typescript
// In any component or API route
const { user } = useAuth();

// Use user.id for authenticated requests
const response = await fetch('/api/some-endpoint', {
  headers: {
    'Authorization': `Bearer ${user?.id}`
  }
});
```

## API Endpoints Reference

### POST /api/auth/signup
Register new user
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "confirmPassword": "password123"
}
```

Response (201):
```json
{
  "success": true,
  "message": "Signup successful! Please check your email.",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### POST /api/auth/signin
Login user
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response (200):
```json
{
  "success": true,
  "message": "Signin successful",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### POST /api/auth/signout
Logout user
```json
{}
```

Response (200):
```json
{
  "success": true,
  "message": "Signed out successfully"
}
```

## Data Flow

### Signup Flow
```
User enters credentials
         ↓
AuthModal sends POST /api/auth/signup
         ↓
Backend validates input
         ↓
Create user in Supabase Auth
         ↓
Create user in Prisma DB
         ↓
Return user data to frontend
         ↓
AuthContext updates with new user
         ↓
Redirect to dashboard
```

### Login Flow
```
User enters email/password
         ↓
AuthModal sends POST /api/auth/signin
         ↓
Backend validates input
         ↓
Supabase authenticates credentials
         ↓
Fetch user from Prisma DB
         ↓
Return user data
         ↓
AuthContext updates
         ↓
Supabase session is created
         ↓
Redirect to dashboard
```

## Security Features

✅ **Password Security**
- Minimum 6 characters
- Never stored in plain text (Supabase handles hashing)
- Confirmed on signup

✅ **Authorization**
- Supabase session tokens
- Protected routes with auth check
- User can only access own data

✅ **Data Protection**
- User data in Prisma/PostgreSQL
- Separate from auth credentials
- Timestamps for audit trail

✅ **Error Handling**
- Validate all inputs
- Meaningful error messages
- No sensitive data in responses

## Testing the Setup

### Test 1: Sign Up
1. Go to landing page
2. Click "Sign Up" button
3. Fill form with:
   - Email: test@example.com
   - Name: Test User
   - Password: password123
   - Confirm: password123
4. Click Sign Up
5. Should redirect to dashboard
6. Check database - user should exist in `User` table

### Test 2: Sign In
1. Go to landing page
2. Click "Sign In" button
3. Use credentials from signup
4. Should redirect to dashboard

### Test 3: Protected Routes
1. Logout
2. Navigate to `/dashboard` - should redirect to home
3. Login again
4. `/dashboard` should be accessible

### Test 4: Session Persistence
1. Login
2. Refresh page - user should still be logged in
3. Close and reopen browser - session should persist

## Troubleshooting

### "Missing Supabase URL"
- Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`
- Restart dev server after adding env vars

### "User created but not in database"
- Check Prisma connection
- Verify `DATABASE_URL` is correct
- Run `npx prisma db push`

### "Login works but user data not found"
- Check user exists in `User` table
- Verify Supabase User ID matches Prisma record

### "Protected routes not redirecting"
- Ensure `AuthProvider` wraps app in `layout.tsx`
- Check `useAuth()` is inside `AuthProvider`

## Next Steps (Optional)

- [ ] Add Google OAuth
- [ ] Add GitHub OAuth  
- [ ] Add email verification
- [ ] Add password reset flow
- [ ] Add 2FA support
- [ ] Add social sign-up
- [ ] Add profile management page
- [ ] Add session timeout

- Current password verification
- New password confirmation
- Password visibility toggles
- Form validation
- Clean, minimal design

**Props:**
- `isOpen`: boolean - Controls modal visibility
- `onClose`: () => void - Callback when modal is closed

### 3. Updated Navbar (`components/Navbar.tsx`)

Enhanced navbar with user account management.

**Features:**
- User profile dropdown
- Change password option
- Logout functionality
- Click-outside-to-close behavior
- Smooth animations

## User Flow

### Landing Page → Dashboard

1. User clicks "Try Demo" or "Sign In" button
2. AuthModal opens with login form
3. User can:
   - Sign in with email/password
   - Sign up for new account
   - Use social login (Facebook, Google, LinkedIn)
4. On successful authentication, user is redirected to dashboard

### Dashboard → Logout

1. User clicks on profile dropdown in navbar
2. Dropdown shows:
   - User info (name, email)
   - Change Password option
   - Logout option
3. Clicking "Logout" redirects to landing page

### Change Password

1. User clicks "Change Password" in dropdown
2. ChangePasswordModal opens
3. User enters:
   - Current password
   - New password
   - Confirm new password
4. Password is updated on submission

## Styling

All authentication components follow the TradeFlux design system:

- **Colors:**
  - Primary: Yellow gradient (#facc15 to #eab308)
  - Background: White for forms, dark slate for welcome panels
  - Text: Dark gray for inputs, white for dark backgrounds

- **Components:**
  - Rounded corners (rounded-lg, rounded-2xl)
  - Subtle shadows
  - Smooth transitions
  - Focus states with yellow ring

- **Animations:**
  - Fade in for modal backdrop
  - Slide up for modal content
  - Smooth hover effects

## TODO: Backend Integration

Currently, the authentication system uses placeholder functions. To integrate with a real backend:

1. **Create API Routes:**
   ```typescript
   // app/api/auth/login/route.ts
   // app/api/auth/signup/route.ts
   // app/api/auth/logout/route.ts
   // app/api/auth/change-password/route.ts
   ```

2. **Add Authentication Library:**
   - NextAuth.js for session management
   - JWT for token-based auth
   - bcrypt for password hashing

3. **Update Components:**
   - Replace console.log with actual API calls
   - Add error handling and validation
   - Implement session management
   - Add loading states

4. **Database:**
   - User model already exists in Prisma schema
   - Add password hashing before storage
   - Implement session storage

## Security Considerations

- Passwords should be hashed using bcrypt
- Implement rate limiting on auth endpoints
- Use HTTPS in production
- Add CSRF protection
- Implement session timeout
- Add email verification for new accounts
- Implement password strength requirements
- Add 2FA support (future enhancement)
