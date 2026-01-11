# Email Notifications - Quick Start Guide

## TL;DR Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set environment variables:**
   ```env
   RESEND_API_KEY=your_key_from_resend.com
   EMAIL_FROM=noreply@vamsa.family
   APP_URL=http://localhost:3000
   ```

3. **Run database migration:**
   ```bash
   pnpm db:push
   pnpm db:generate
   ```

4. **Test it:**
   - Create a suggestion
   - Admins will get an email notification
   - Submitter gets notified when you review it

## What Happens Automatically

### When a Suggestion is Created
```
User submits suggestion → Admins get notified (respecting their preferences)
```

### When a Suggestion is Reviewed
```
Admin reviews → Original submitter gets notified (respecting their preferences)
```

### When Someone Joins
```
User claims profile → All members get notified (respecting their preferences)
```

### Birthday Reminders
```
Daily cron job (9 AM) → People with birthdays get reminder emails
```

## User Preferences

Users can control which notifications they receive via:

```typescript
// Get preferences
const prefs = await getEmailNotificationPreferences();

// Update preferences (e.g., disable suggestion created emails)
await updateEmailNotificationPreferences({
  suggestionsCreated: false
});
```

## Email Types

| Type | Recipients | Trigger | Content |
|------|-----------|---------|---------|
| Suggestion Created | Admins | New suggestion submitted | Details about suggestion + link to review |
| Suggestion Updated | Submitter | Suggestion reviewed | Approval/rejection status + reviewer notes |
| New Member | All members | User claims profile | New member details + link to family tree |
| Birthday Reminder | All users | Daily (9 AM) | Birthday celebration + link to person profile |

## Development Mode

Without `RESEND_API_KEY` set:
- Emails are NOT sent
- Entries are logged to `EmailLog` table for testing
- Console shows what would be sent
- Perfect for local development

## Check Email Logs

```sql
-- See all emails sent
SELECT * FROM "EmailLog" ORDER BY "sentAt" DESC LIMIT 20;

-- See failed emails
SELECT * FROM "EmailLog" WHERE status = 'failed';

-- Count by type
SELECT "emailType", COUNT(*) as count FROM "EmailLog" GROUP BY "emailType";
```

## Troubleshooting

### Emails not being sent?
1. Check if `RESEND_API_KEY` is set
2. Check `EmailLog` table for errors
3. Look at server console for warnings

### Wrong recipient?
1. Check user's `emailNotificationPreferences` in database
2. Verify email addresses in `User` table

### Want to test without Resend?
- Just run without setting `RESEND_API_KEY`
- Emails will be logged but not sent
- Great for development!

## Files to Know

| File | Purpose |
|------|---------|
| `packages/api/src/email/` | Email service, templates, config |
| `apps/web/src/server/notifications.ts` | Server functions for notifications |
| `packages/api/prisma/schema.prisma` | Database schema (EmailLog + User preferences) |
| `docs/EMAIL_NOTIFICATIONS.md` | Full documentation |

## Next Steps

1. Set up Resend account: https://resend.com
2. Add environment variables
3. Run migrations
4. Test by creating a suggestion
5. Check `EmailLog` table to verify
6. Connect cron job for birthday reminders (optional)

## Common Tasks

### Enable/Disable Email Type for a User

```typescript
await updateEmailNotificationPreferences({
  suggestionsCreated: true,    // Get notified about pending suggestions
  suggestionsUpdated: false,   // Don't notify about own suggestion reviews
  newMemberJoined: true,       // Get notified when members join
  birthdayReminders: false     // No birthday emails
});
```

### Check Email Delivery Status

```sql
-- Sent successfully
SELECT COUNT(*) as sent FROM "EmailLog" WHERE status = 'sent';

-- Failed
SELECT COUNT(*) as failed FROM "EmailLog" WHERE status = 'failed';

-- Failed emails with error details
SELECT "recipientEmail", "subject", error FROM "EmailLog"
WHERE status = 'failed'
ORDER BY "sentAt" DESC;
```

### View Email History for User

```sql
SELECT "recipientEmail", "emailType", status, "sentAt" FROM "EmailLog"
WHERE "recipientEmail" = 'user@example.com'
ORDER BY "sentAt" DESC;
```

## API Reference Summary

### Get Preferences
```typescript
const prefs = await getEmailNotificationPreferences();
```

### Update Preferences
```typescript
await updateEmailNotificationPreferences({
  suggestionsCreated: false,
  // ... other preferences
});
```

### Email Service (Internal)
```typescript
import { emailService, createSuggestionCreatedEmail } from '@vamsa/api';

const template = createSuggestionCreatedEmail(
  'John Doe',           // submitter
  'Jane Doe',           // target person
  'CREATE',             // suggestion type
  'https://vamsa.family/admin/suggestions'
);

const result = await emailService.sendEmail(
  'admin@example.com',
  template,
  'suggestion_created',
  userId,
  { suggestionId: '123' }
);
```

## Support

For detailed documentation, see: `/docs/EMAIL_NOTIFICATIONS.md`

For implementation details, see: `/IMPLEMENTATION_SUMMARY.md`
