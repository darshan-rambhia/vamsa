# Email Notification System

This document describes the email notification infrastructure implemented for Vamsa.

## Overview

The email notification system allows the application to send automated emails to users for various events:

1. **Suggestion Created** - Admins are notified when a new suggestion is submitted for review
2. **Suggestion Updated** - Submitters are notified when their suggestion is approved or rejected
3. **New Member Joined** - All members are notified when a new family member joins the family tree
4. **Birthday Reminders** - Users receive daily reminders for family members with birthdays

## Architecture

### Email Provider

The system uses **Resend** as the email service provider. Resend is a modern email API that handles email delivery, bounce tracking, and analytics.

**Configuration:**

- Set `RESEND_API_KEY` environment variable with your Resend API key
- Set `EMAIL_FROM` environment variable for the sender address (defaults to `noreply@vamsa.family`)
- Set `APP_URL` environment variable for generating links in emails (defaults to `https://vamsa.family`)

### Database Schema

#### User Model Updates

- Added `emailNotificationPreferences` JSON field with default notification settings:
  ```json
  {
    "suggestionsCreated": true,
    "suggestionsUpdated": true,
    "newMemberJoined": true,
    "birthdayReminders": true
  }
  ```

#### New EmailLog Model

Tracks all sent, failed, and bounced emails:

```prisma
model EmailLog {
  id              String   @id @default(cuid())
  recipientEmail  String
  subject         String
  emailType       String   // "suggestion_created", "suggestion_updated", "new_member", "birthday_reminder"
  status          String   @default("sent") // "sent", "failed", "bounced"
  sentAt          DateTime @default(now())
  error           String?
  resendId        String?  // Resend email ID for tracking
  metadata        Json?    // Additional context (suggestionId, userId, etc.)

  createdBy   User   @relation("EmailLogCreator", fields: [createdById], references: [id])
  createdById String

  @@index([recipientEmail])
  @@index([emailType])
  @@index([status])
  @@index([sentAt])
}
```

### File Structure

```
packages/api/src/email/
├── config.ts          # Configuration and types
├── templates.ts       # Email template functions
├── service.ts         # Email sending service
└── index.ts           # Public exports

apps/web/src/server/
└── notifications.ts   # Server functions for notification triggers
```

## API Reference

### Email Service (`emailService`)

#### `sendEmail(to, template, emailType, userId, metadata?)`

Sends an email via Resend and logs it to the database.

**Parameters:**

- `to`: Recipient email address
- `template`: EmailTemplate object with subject, html, and text
- `emailType`: Type of email (for logging and tracking)
- `userId`: ID of the system user creating the log entry
- `metadata`: Optional object with additional context

**Returns:**

```typescript
{ success: boolean; messageId?: string; error?: string }
```

**Example:**

```typescript
const result = await emailService.sendEmail(
  user.email,
  template,
  "suggestion_created",
  systemUser.id,
  { suggestionId: "abc123" }
);
```

#### `parseNotificationPreferences(json)`

Parses notification preferences from stored JSON.

**Returns:** `NotificationPreferences` object

#### `shouldSendNotification(preferences, notificationType)`

Checks if a user wants to receive a particular notification type.

**Parameters:**

- `preferences`: NotificationPreferences object
- `notificationType`: One of "suggestionsCreated", "suggestionsUpdated", "newMemberJoined", "birthdayReminders"

**Returns:** `boolean`

### Email Templates

#### `createSuggestionCreatedEmail(submitterName, targetPersonName, suggestionType, dashboardUrl)`

Template for notifying admins of new suggestions.

#### `createSuggestionUpdatedEmail(submitterName, status, reviewNote, targetPersonName, dashboardUrl)`

Template for notifying suggestion submitters of approval/rejection.

#### `createNewMemberEmail(newMemberName, newMemberEmail, familyName, treeUrl)`

Template for notifying members of new family member joining.

#### `createBirthdayReminderEmail(recipientName, celebrantName, birthDate, treeUrl)`

Template for daily birthday reminders.

### Server Functions

#### `getEmailNotificationPreferences()`

Get current user's email notification preferences.

**Returns:** `Record<string, boolean>` with preference flags

**Usage:**

```typescript
const preferences = await getEmailNotificationPreferences();
console.log(preferences.suggestionsCreated); // true or false
```

#### `updateEmailNotificationPreferences(data)`

Update current user's email notification preferences.

**Parameters:**

```typescript
{
  suggestionsCreated?: boolean;
  suggestionsUpdated?: boolean;
  newMemberJoined?: boolean;
  birthdayReminders?: boolean;
}
```

**Returns:**

```typescript
{
  success: boolean;
  preferences: Record<string, boolean>;
}
```

**Usage:**

```typescript
const result = await updateEmailNotificationPreferences({
  suggestionsCreated: false,
  birthdayReminders: true,
});
```

### Internal Notification Functions

These functions are called automatically by the application and notify relevant users.

#### `notifySuggestionCreated(suggestionId)`

Called when a new suggestion is created. Notifies all active admins.

#### `notifySuggestionUpdated(suggestionId, status)`

Called when a suggestion is reviewed. Notifies the submitter.

#### `notifyNewMemberJoined(userId)`

Called when a new user claims their profile. Notifies all active members.

#### `sendBirthdayReminders()`

Called daily (via cron job). Sends birthday reminder emails to all users.

## Integration Points

### Suggestion Creation Flow

1. User submits suggestion via `createSuggestion` server function
2. Function automatically calls `notifySuggestionCreated(suggestionId)`
3. All active admins receive notification email (respecting their preferences)
4. Email is logged to `EmailLog` table with status and metadata

### Suggestion Review Flow

1. Admin reviews suggestion via `reviewSuggestion` server function
2. Function automatically calls `notifySuggestionUpdated(suggestionId, status)`
3. Original submitter receives notification email (respecting their preferences)
4. Email is logged to `EmailLog` table

### New Member Flow

1. User claims their profile via `claimProfile` server function
2. Function automatically calls `notifyNewMemberJoined(userId)`
3. All active members receive notification email (respecting their preferences)
4. Email is logged to `EmailLog` table

### Birthday Reminders

1. Scheduled job calls `sendBirthdayReminders()` daily (typically at 9 AM)
2. All people with birthdays today are identified
3. Each active user receives a reminder email (respecting their preferences)
4. Each email is logged to `EmailLog` table

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

The `resend` package will be installed from `packages/api/package.json`.

### 2. Set Up Environment Variables

Create or update your `.env` file:

```env
# Email Configuration
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=noreply@vamsa.family
APP_URL=http://localhost:3000  # For development
```

### 3. Run Database Migration

```bash
pnpm db:push
pnpm db:generate
```

This will:

- Create the `EmailLog` table
- Add `emailNotificationPreferences` column to `User` table
- Generate updated Prisma client types

### 4. Set Up Birthday Reminder Cron Job (Optional)

For production deployments, add a scheduled job to call `sendBirthdayReminders()` daily:

**Example with Node-cron (in `packages/api/src/cron/tasks.ts`):**

```typescript
import cron from "node-cron";
import { sendBirthdayReminders } from "@vamsa/web/src/server/notifications";

// Run daily at 9 AM
cron.schedule("0 9 * * *", async () => {
  console.log("Running birthday reminders...");
  await sendBirthdayReminders();
});
```

Or use your hosting platform's built-in cron support (e.g., AWS Lambda, Cloud Functions).

## Email Templates

All templates are HTML-only with responsive design. They include:

- **Visual Branding**: Using editorial + earth tones design system
- **Call-to-Action Buttons**: Links to relevant pages
- **Plain Text Fallback**: For email clients that don't support HTML
- **Mobile-Responsive**: Optimized for all screen sizes

### Design System

- **Primary Color**: Forest green (#2d5016)
- **Secondary Color**: Bark brown (#8b6f47)
- **Accent Color**: Warm cream (#f5f1e8)
- **Typography**: Source Sans 3 (body), Fraunces (headings)

## Error Handling

The email service includes comprehensive error handling:

1. **Missing API Key**: If `RESEND_API_KEY` is not set, emails are logged but not sent (development mode)
2. **Network Errors**: Caught and logged to `EmailLog` with error message
3. **Invalid Recipients**: Resend validation catches invalid email addresses
4. **Database Failures**: Try-catch blocks log errors without crashing

All errors are logged with context for debugging.

## Testing

### Manual Testing

1. **Get Preferences:**

   ```typescript
   const prefs = await getEmailNotificationPreferences();
   ```

2. **Update Preferences:**

   ```typescript
   await updateEmailNotificationPreferences({
     suggestionsCreated: false,
   });
   ```

3. **Create a Test Suggestion:**

   ```typescript
   await createSuggestion({
     type: "CREATE",
     suggestedData: { firstName: "Test", lastName: "User" },
     reason: "Testing email notifications",
   });
   ```

4. **Check Email Logs:**
   ```sql
   SELECT * FROM "EmailLog"
   ORDER BY "sentAt" DESC
   LIMIT 10;
   ```

### E2E Testing

Email sending can be tested in E2E tests by:

1. Mocking the Resend API in test environment
2. Checking `EmailLog` table for email records
3. Verifying email content and recipient

## Monitoring

### Email Status Dashboard

Query `EmailLog` table to monitor email delivery:

```sql
-- Count emails by type and status
SELECT "emailType", status, COUNT(*) as count
FROM "EmailLog"
WHERE "sentAt" > NOW() - INTERVAL '7 days'
GROUP BY "emailType", status;

-- Find failed emails
SELECT * FROM "EmailLog"
WHERE status = 'failed'
ORDER BY "sentAt" DESC;

-- Email volume by day
SELECT DATE("sentAt"), COUNT(*) as count
FROM "EmailLog"
WHERE "sentAt" > NOW() - INTERVAL '30 days'
GROUP BY DATE("sentAt")
ORDER BY DATE("sentAt");
```

### Resend Dashboard

Visit https://resend.com/emails to view:

- Email delivery status
- Bounce rates
- Open/click tracking
- Email performance metrics

## Troubleshooting

### Emails Not Being Sent

1. **Check API Key**: Verify `RESEND_API_KEY` is set

   ```bash
   echo $RESEND_API_KEY
   ```

2. **Check EmailLog Table**:

   ```sql
   SELECT * FROM "EmailLog"
   WHERE status != 'sent'
   LIMIT 5;
   ```

3. **Check Console Logs**: Look for warnings in server logs
   ```
   [EmailService] Email sending disabled. Would send to: ...
   ```

### Emails Going to Spam

1. **Verify Sender Domain**: Resend automatically verifies your domain
2. **Check SPF/DKIM**: Ensure DNS records are properly configured
3. **Resend Configuration**: Verify domain in Resend dashboard

### Notification Preferences Not Updating

1. **Check User Record**: Verify `emailNotificationPreferences` column exists

   ```sql
   SELECT "emailNotificationPreferences" FROM "User" LIMIT 1;
   ```

2. **Run Migration**: Ensure database schema is up to date
   ```bash
   pnpm db:push
   pnpm db:generate
   ```

## Future Enhancements

1. **Email Template Customization**: Allow admins to customize email templates
2. **Unsubscribe Links**: Add unsubscribe functionality to email footers
3. **Email Batching**: Batch multiple notifications into digest emails
4. **SMS Notifications**: Add SMS support alongside email
5. **Notification Analytics**: Dashboard showing email performance metrics
6. **User Email Validation**: Verify email addresses before sending
7. **Rate Limiting**: Prevent email spam and rate limit notifications

## Dependencies

- **resend**: ^3.0.0 - Email service provider

## Related Files

- Database schema: `/packages/api/prisma/schema.prisma`
- Email configuration: `/packages/api/src/email/config.ts`
- Templates: `/packages/api/src/email/templates.ts`
- Service: `/packages/api/src/email/service.ts`
- Server functions: `/apps/web/src/server/notifications.ts`
- Auth integration: `/apps/web/src/server/auth.ts`
- Suggestions integration: `/apps/web/src/server/suggestions.ts`
