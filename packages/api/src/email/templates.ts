export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export function createSuggestionCreatedEmail(
  submitterName: string,
  targetPersonName: string,
  suggestionType: string,
  dashboardUrl: string
): EmailTemplate {
  const typeLabel =
    {
      CREATE: "New Person Suggestion",
      UPDATE: "Person Information Update",
      DELETE: "Person Deletion",
      ADD_RELATIONSHIP: "New Relationship Suggestion",
    }[suggestionType] || suggestionType;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Source Sans 3', sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2d5016; color: #f5f1e8; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f8f5; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2d5016; color: #f5f1e8; text-decoration: none; border-radius: 4px; margin-top: 16px; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>New Suggestion Pending Review</h2>
          </div>
          <div class="content">
            <p>Hello Family Administrator,</p>

            <p><strong>${submitterName}</strong> has submitted a new suggestion:</p>

            <p style="margin: 20px 0; padding: 12px; background-color: #e8f5e9; border-left: 4px solid #2d5016;">
              <strong>${typeLabel}</strong><br>
              ${targetPersonName ? `Target: ${targetPersonName}` : ""}
            </p>

            <p>Please review and approve or reject this suggestion in the admin dashboard.</p>

            <a href="${dashboardUrl}" class="button">Review Suggestion</a>

            <p style="margin-top: 20px;">Best regards,<br>Vamsa Family Tree</p>
          </div>
          <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
New Suggestion Pending Review

Hello Family Administrator,

${submitterName} has submitted a new suggestion:

${typeLabel}
${targetPersonName ? `Target: ${targetPersonName}` : ""}

Please review and approve or reject this suggestion in the admin dashboard:
${dashboardUrl}

Best regards,
Vamsa Family Tree
  `;

  return {
    subject: `New ${typeLabel} Pending Review`,
    html,
    text,
  };
}

export function createSuggestionUpdatedEmail(
  submitterName: string,
  status: "APPROVED" | "REJECTED",
  reviewNote: string | null,
  targetPersonName: string,
  dashboardUrl: string
): EmailTemplate {
  const statusLabel = status === "APPROVED" ? "Approved" : "Rejected";
  const statusColor = status === "APPROVED" ? "#2d5016" : "#c62e2e";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Source Sans 3', sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${statusColor}; color: #f5f1e8; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f8f5; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: ${statusColor}; color: #f5f1e8; text-decoration: none; border-radius: 4px; margin-top: 16px; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; }
          .status-badge { display: inline-block; padding: 4px 12px; background-color: ${statusColor}; color: #f5f1e8; border-radius: 20px; font-weight: bold; }
          .note-box { margin: 16px 0; padding: 12px; background-color: #f0f0f0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Your Suggestion Has Been Reviewed</h2>
          </div>
          <div class="content">
            <p>Hello ${submitterName},</p>

            <p>Your suggestion for <strong>${targetPersonName}</strong> has been reviewed.</p>

            <p>
              <span class="status-badge">${statusLabel}</span>
            </p>

            ${reviewNote ? `<div class="note-box"><strong>Reviewer's Note:</strong><br>${escapeHtml(reviewNote)}</div>` : ""}

            <a href="${dashboardUrl}" class="button">View Details</a>

            <p style="margin-top: 20px;">Best regards,<br>Vamsa Family Tree</p>
          </div>
          <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Your Suggestion Has Been Reviewed

Hello ${submitterName},

Your suggestion for ${targetPersonName} has been reviewed.

Status: ${statusLabel}

${reviewNote ? `Reviewer's Note:\n${reviewNote}\n` : ""}

View details: ${dashboardUrl}

Best regards,
Vamsa Family Tree
  `;

  return {
    subject: `Your Suggestion Has Been ${statusLabel}`,
    html,
    text,
  };
}

export function createNewMemberEmail(
  newMemberName: string,
  newMemberEmail: string,
  familyName: string,
  treeUrl: string
): EmailTemplate {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Source Sans 3', sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2d5016; color: #f5f1e8; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f8f5; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2d5016; color: #f5f1e8; text-decoration: none; border-radius: 4px; margin-top: 16px; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; }
          .member-card { margin: 20px 0; padding: 16px; background-color: #e8f5e9; border-left: 4px solid #2d5016; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Welcome to the ${familyName} Family Tree!</h2>
          </div>
          <div class="content">
            <p>Hello Family Members,</p>

            <p>We're excited to announce that a new family member has joined the ${familyName} family tree!</p>

            <div class="member-card">
              <p><strong>New Member:</strong> ${newMemberName}</p>
              <p><strong>Email:</strong> ${newMemberEmail}</p>
            </div>

            <p>Visit the family tree to connect and explore your family's history:</p>

            <a href="${treeUrl}" class="button">View Family Tree</a>

            <p style="margin-top: 20px;">Best regards,<br>Vamsa Family Tree</p>
          </div>
          <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to the ${familyName} Family Tree!

Hello Family Members,

We're excited to announce that a new family member has joined the ${familyName} family tree!

New Member: ${newMemberName}
Email: ${newMemberEmail}

Visit the family tree to connect and explore your family's history:
${treeUrl}

Best regards,
Vamsa Family Tree
  `;

  return {
    subject: `New Family Member Joined: ${newMemberName}`,
    html,
    text,
  };
}

export function createBirthdayReminderEmail(
  recipientName: string,
  celebrantName: string,
  birthDate: Date,
  treeUrl: string
): EmailTemplate {
  const birthDateStr = birthDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: 'Source Sans 3', sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #8b6f47; color: #f5f1e8; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9f8f5; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #8b6f47; color: #f5f1e8; text-decoration: none; border-radius: 4px; margin-top: 16px; }
          .footer { margin-top: 20px; font-size: 12px; color: #999; }
          .birthday-card { margin: 20px 0; padding: 20px; background: linear-gradient(135deg, #fff8e1 0%, #fff9c4 100%); border-radius: 8px; text-align: center; border: 2px dashed #fbc02d; }
          .emoji { font-size: 32px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Birthday Reminder</h2>
          </div>
          <div class="content">
            <p>Hello ${recipientName},</p>

            <div class="birthday-card">
              <p class="emoji">🎉</p>
              <p style="font-size: 18px; margin: 8px 0;"><strong>${celebrantName}</strong>'s birthday is today!</p>
              <p style="margin: 8px 0; color: #666;">${birthDateStr}</p>
            </div>

            <p>Don't forget to reach out and share your birthday wishes!</p>

            <a href="${treeUrl}" class="button">View Profile</a>

            <p style="margin-top: 20px;">Best regards,<br>Vamsa Family Tree</p>
          </div>
          <div class="footer">
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Birthday Reminder

Hello ${recipientName},

${celebrantName}'s birthday is today (${birthDateStr})!

Don't forget to reach out and share your birthday wishes.

View profile: ${treeUrl}

Best regards,
Vamsa Family Tree
  `;

  return {
    subject: `Happy Birthday ${celebrantName}! 🎉`,
    html,
    text,
  };
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
