/**
 * Email notifications for backups
 *
 * Sends success/failure notifications when backups complete
 */

import { logger, serializeError } from "@vamsa/lib/logger";

export type NotificationType = "success" | "failure";

export interface BackupNotificationInput {
  type: NotificationType;
  filename: string;
  size?: number;
  duration?: number;
  error?: string;
  emails: string[];
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Send backup notification email
 */
export async function sendBackupNotification(
  input: BackupNotificationInput
): Promise<void> {
  const { type, filename, size, duration, error, emails } = input;

  // Skip if no emails provided
  if (!emails || emails.length === 0) {
    logger.info("No notification emails configured, skipping notification");
    return;
  }

  try {
    // Build email content based on notification type
    let subject: string;
    let _htmlBody: string;

    if (type === "success") {
      const sizeStr = size ? formatFileSize(size) : "unknown";
      const durationStr = duration ? formatDuration(duration) : "unknown";

      subject = "Vamsa Backup Completed Successfully";
      _htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #2d5016; color: white; padding: 20px; border-radius: 4px 4px 0 0; }
      .content { background-color: #f5f5f5; padding: 20px; border-radius: 0 0 4px 4px; }
      .details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #2d5016; }
      .detail-row { display: flex; justify-content: space-between; padding: 5px 0; }
      .detail-label { font-weight: bold; color: #666; }
      .success { color: #22863a; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Backup Completed</h1>
      </div>
      <div class="content">
        <p>Your Vamsa backup has completed successfully.</p>

        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="success">✓ Completed</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Filename:</span>
            <span>${filename}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Size:</span>
            <span>${sizeStr}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span>${durationStr}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span>${new Date().toLocaleString()}</span>
          </div>
        </div>

        <p style="color: #666; font-size: 14px;">Your backup is securely stored and ready for recovery if needed.</p>
      </div>
    </div>
  </body>
</html>
`;
    } else {
      subject = "Vamsa Backup Failed";
      _htmlBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background-color: #d1293d; color: white; padding: 20px; border-radius: 4px 4px 0 0; }
      .content { background-color: #f5f5f5; padding: 20px; border-radius: 0 0 4px 4px; }
      .details { background-color: white; padding: 15px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #d1293d; }
      .detail-row { display: flex; justify-content: space-between; padding: 5px 0; }
      .detail-label { font-weight: bold; color: #666; }
      .error { color: #d1293d; font-family: 'Courier New', monospace; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Backup Failed</h1>
      </div>
      <div class="content">
        <p>Your Vamsa backup has failed. Please check the error details below and take appropriate action.</p>

        <div class="details">
          <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="error">✗ Failed</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Filename:</span>
            <span>${filename}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span>${new Date().toLocaleString()}</span>
          </div>
        </div>

        ${
          error
            ? `
        <div class="details">
          <div class="detail-label">Error:</div>
          <div class="error" style="margin-top: 10px; padding: 10px; background-color: #fff3cd; border-radius: 4px;">
            ${error}
          </div>
        </div>
        `
            : ""
        }

        <p style="color: #666; font-size: 14px;">Please check your Vamsa settings and try again. If the problem persists, please contact your administrator.</p>
      </div>
    </div>
  </body>
</html>
`;
    }

    // TODO: Integrate with actual email service
    // For now, just log the notification
    logger.info(
      {
        type,
        subject,
        recipients: emails,
        filename,
      },
      "Would send backup notification email"
    );

    // Placeholder for actual email sending
    // This would integrate with:
    // - SendGrid
    // - AWS SES
    // - SMTP service
    // - Or other email provider configured in env vars
  } catch (error) {
    logger.error(
      { error: serializeError(error) },
      "Failed to send backup notification"
    );
    // Don't throw - notification failure should not block backup process
  }
}
