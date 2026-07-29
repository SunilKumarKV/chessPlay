# Auth Flow Smoke Test Checklist

**Date:** June 2, 2026  
**Branch:** feature/auth-email-otp-verification  
**Tester:** Principal Engineer QA

## Test Environment Setup
- [ ] Start dev server: `pnpm dev:multi`
- [ ] Open browser console (F12) to monitor for errors
- [ ] Clear localStorage before each test scenario

## 1. Registration & Email Verification Flow

### 1.1 Register with email/password (new account)
- [ ] Navigate to `/register`
- [ ] Enter username (3-16 chars, alphanumeric)
- [ ] Enter email (valid format)
- [ ] Enter password (8+ chars, mixed case, number, symbol)
- [ ] Click "Sign up"
- [ ] **Expected:** Redirects to `/verify-email`
- [ ] **Check:** User data shows `emailVerified: false` in console
- [ ] **Check:** Cannot access `/dashboard` (blocked by guard)
- [ ] **Check:** OTP field visible and focused
- [ ] **Check:** "Resend code" button available
- [ ] **Check:** "Logout" button available

### 1.2 Attempt to access dashboard while unverified
- [ ] While on verify-email page, try to navigate to `/`
- [ ] **Expected:** Redirected back to `/verify-email`
- [ ] **Check:** Page is shown, not bypassed

### 1.3 Resend verification OTP
- [ ] Click "Resend code" button
- [ ] **Expected:** "Resending..." text appears
- [ ] **Expected:** Button becomes "Resend in 60s"
- [ ] **Expected:** Countdown visible and working
- [ ] **Expected:** After 60s, button re-enables
- [ ] **Check:** Can click multiple times without errors

### 1.4 Submit invalid OTP
- [ ] Enter "000000" in OTP field
- [ ] Click "Verify email"
- [ ] **Expected:** Error message: "Invalid verification code."
- [ ] **Expected:** Can retry

### 1.5 Submit valid OTP (from email mock/inbox)
- [ ] Copy 6-digit OTP from email
- [ ] Enter OTP in field
- [ ] Click "Verify email"
- [ ] **Expected:** "Email verified successfully" message
- [ ] **Expected:** Redirects to `/dashboard`
- [ ] **Expected:** User now has `emailVerified: true`
- [ ] **Check:** Can access all app features
- [ ] **Check:** No console errors

---

## 2. Password Reset Flow

### 2.1 Forgot Password - Valid Email
- [ ] Navigate to `/login`
- [ ] Click "Forgot your password?"
- [ ] Redirects to `/forgot-password`
- [ ] Enter registered email
- [ ] Click "Send reset code"
- [ ] **Expected:** "If an account exists, a reset code has been sent." message
- [ ] **Expected:** "Enter reset code" button appears

### 2.2 Direct /reset-password access without email
- [ ] Navigate to `/reset-password` (no query param)
- [ ] **Expected:** Email field visible and empty
- [ ] **Expected:** Helper text: "Enter the email where you requested the reset code."
- [ ] **Expected:** Subtitle changes dynamically

### 2.3 /reset-password with email query param
- [ ] Navigate to `/reset-password?email=test@example.com`
- [ ] **Expected:** Email field pre-filled
- [ ] **Expected:** Subtitle: "Choose a strong password..."

### 2.4 Reset code resend without email
- [ ] On reset page with empty email field
- [ ] Click "Resend reset code"
- [ ] **Expected:** Error: "Enter your email first."

### 2.5 Reset code resend with email
- [ ] Fill email field
- [ ] Click "Resend reset code"
- [ ] **Expected:** "Resending..." text
- [ ] **Expected:** "Resend in 60s" countdown active
- [ ] **Expected:** After 60s, button re-enables

### 2.6 Invalid reset code
- [ ] Enter email
- [ ] Enter "000000" for reset code
- [ ] Enter valid password twice
- [ ] Click "Reset password"
- [ ] **Expected:** Error: "Invalid or expired reset code"

### 2.7 Valid reset code
- [ ] Enter email
- [ ] Enter correct 6-digit OTP from email
- [ ] Enter valid password (8+ chars, mixed case, number, symbol)
- [ ] Enter same password again
- [ ] Click "Reset password"
- [ ] **Expected:** "Password reset successful. Please log in again."
- [ ] **Expected:** Redirects to login page
- [ ] **Expected:** Session cleared (no logged-in user)

### 2.8 Login with new password
- [ ] On login page, enter email and new password
- [ ] Click "Sign in"
- [ ] **Expected:** Login successful
- [ ] **Expected:** Redirects to dashboard
- [ ] **Check:** No console errors

---

## 3. Google Authentication

### 3.1 Google button visibility (when configured)
- [ ] Navigate to `/login`
- [ ] **Expected:** Google button visible (if VITE_GOOGLE_CLIENT_ID set)
- [ ] **Expected:** Button text "Continue with Google"
- [ ] **Check:** No iframe loaded in network yet

### 3.2 Google button visibility (when NOT configured)
- [ ] Set `VITE_GOOGLE_CLIENT_ID` to empty string in .env
- [ ] Rebuild frontend or restart dev
- [ ] Navigate to `/login`
- [ ] **Expected:** Google button NOT visible
- [ ] **Expected:** Only email fields shown
- [ ] **Check:** No Google iframe in network tab

### 3.3 Google login - new user
- [ ] On login page with Google enabled
- [ ] Click Google button
- [ ] Complete Google OAuth flow
- [ ] **Expected:** Account created
- [ ] **Expected:** User has `emailVerified: true`
- [ ] **Expected:** Redirects directly to `/dashboard`
- [ ] **Expected:** No verify-email flow
- [ ] **Check:** No console errors

### 3.4 Google login - existing user
- [ ] Register normally, verify email, logout
- [ ] Login with same email via Google
- [ ] **Expected:** Login succeeds
- [ ] **Expected:** Redirects to dashboard
- [ ] **Expected:** No verification flow needed

---

## 4. Edge Cases

### 4.1 Expired OTP tokens
- [ ] On verify-email page, wait 10+ minutes without entering OTP
- [ ] Try to enter OTP
- [ ] **Expected:** Error: "Verification code expired. Request a new code."
- [ ] **Expected:** Can click "Resend code" to get new OTP

### 4.2 Rate limiting
- [ ] Try to verify email with wrong OTP 5+ times rapidly
- [ ] **Expected:** Error: "Too many incorrect codes. Request a new verification code."
- [ ] **Expected:** Must wait 60s before resending

### 4.3 Rate limiting - forgot password
- [ ] Try to request password reset 10+ times in 15 minutes
- [ ] **Expected:** Error: "Too many requests from this IP, please try again after 15 minutes"

### 4.4 Mobile views
- [ ] Test all pages at 375px width (iPhone SE)
- [ ] **Expected:** All buttons, fields, text readable and clickable
- [ ] **Expected:** No horizontal scroll
- [ ] **Expected:** OTP input accepts numeric only
- [ ] **Expected:** Passwords hide/show toggles work

---

## 5. Security Checks

### 5.1 No account enumeration on forgot-password
- [ ] Request password reset for non-existent email
- [ ] **Expected:** Generic message: "If an account exists, a reset code has been sent."
- [ ] **Expected:** No difference vs real account

### 5.2 No raw OTP in console
- [ ] Check browser console logs
- [ ] **Expected:** No OTP codes visible in Network tab responses
- [ ] **Expected:** No OTP in error messages to users

### 5.3 No password in logs
- [ ] Submit registration with password
- [ ] Check backend logs
- [ ] **Expected:** No password visible
- [ ] **Expected:** No hashed password in response body

### 5.4 Session cleared on password reset
- [ ] Login and get tokens
- [ ] Reset password
- [ ] **Expected:** Old tokens invalidated
- [ ] **Expected:** Cannot use old token to access API
- [ ] **Expected:** Must login again with new password

---

## 6. Email Delivery

### 6.1 Verification email received
- [ ] Register new account
- [ ] **Expected:** Email received within 10 seconds
- [ ] **Expected:** Subject: "Verify your ChessPlay email"
- [ ] **Expected:** Email contains 6-digit code
- [ ] **Expected:** No raw credentials in email body

### 6.2 Password reset email received
- [ ] Request password reset
- [ ] **Expected:** Email received within 10 seconds
- [ ] **Expected:** Subject: "Your ChessPlay password reset code"
- [ ] **Expected:** Email contains 6-digit code
- [ ] **Expected:** Code matches what backend stored (hashed)

### 6.3 No email in mock mode (dev)
- [ ] Verify mock mode is active: `EMAIL_MOCK_MODE=true`
- [ ] Register account
- [ ] **Expected:** No actual email sent
- [ ] **Expected:** Verification flow still works in UI
- [ ] **Expected:** Backend logs show: `EMAIL_PROVIDER_MOCK_MODE`

---

## 7. Backend Logs Verification

### 7.1 Successful email send
- [ ] In production Render logs or local terminal
- [ ] Search for: `EMAIL_SEND_SUCCESS`
- [ ] **Expected:** Log entry with `to`, `subject`, `messageId`
- [ ] **Expected:** No raw OTP in log

### 7.2 No missing SMTP config warnings
- [ ] Check logs
- [ ] **Expected:** No `EMAIL_PROVIDER_NOT_CONFIGURED`
- [ ] **Expected:** No `SMTP_HOST` env warnings

### 7.3 Auth route coverage
- [ ] Verify all endpoints exist:
  - [ ] `POST /api/auth/register`
  - [ ] `POST /api/auth/login`
  - [ ] `POST /api/auth/forgot-password`
  - [ ] `POST /api/auth/reset-password`
  - [ ] `POST /api/auth/verify-email`
  - [ ] `POST /api/auth/resend-verification`
  - [ ] `POST /api/auth/google`

---

## Test Results Summary

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Registration & Verification | ? | ? | |
| Password Reset | ? | ? | |
| Google Auth | ? | ? | |
| Edge Cases | ? | ? | |
| Security | ? | ? | |
| Email Delivery | ? | ? | |
| Backend Logs | ? | ? | |

**Overall Result:** 🟡 Pending / 🟢 Green / 🔴 Red

---

## Issues Found
(List any bugs or issues discovered during testing)

## Sign-Off
- [ ] Tester name: _____________
- [ ] Date: _____________
- [ ] Approved by: _____________
