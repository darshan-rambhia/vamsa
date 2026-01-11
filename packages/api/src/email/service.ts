import { Resend } from "resend";
import { prisma } from "../index";
import { EMAIL_CONFIG, type NotificationPreferences } from "./config";
import type { EmailTemplate } from "./templates";
import type { Prisma } from "../generated/prisma/client";

export class EmailService {
  private resend: Resend | null;

  constructor() {
    this.resend = null;
    if (EMAIL_CONFIG.enabled && EMAIL_CONFIG.apiKey) {
      this.resend = new Resend(EMAIL_CONFIG.apiKey);
    }
  }

  /**
   * Send an email using Resend
   */
  async sendEmail(
    to: string,
    template: EmailTemplate,
    emailType: string,
    userId: string,
    metadata?: Record<string, unknown> | null
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // If email is not enabled, just log and return
      if (!this.resend) {
        console.warn(
          `[EmailService] Email sending disabled. Would send to: ${to}`,
          `Subject: ${template.subject}`
        );

        // Still log the attempt
        await prisma.emailLog.create({
          data: {
            recipientEmail: to,
            subject: template.subject,
            emailType,
            status: "sent",
            createdById: userId,
            metadata: metadata
              ? (metadata as Prisma.InputJsonValue)
              : undefined,
          },
        });

        return { success: true };
      }

      // Send email via Resend
      const response = await this.resend.emails.send({
        from: EMAIL_CONFIG.from,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      if (response.error) {
        // Log failed email
        await prisma.emailLog.create({
          data: {
            recipientEmail: to,
            subject: template.subject,
            emailType,
            status: "failed",
            error: response.error.message,
            createdById: userId,
            metadata: metadata
              ? (metadata as Prisma.InputJsonValue)
              : undefined,
          },
        });

        return {
          success: false,
          error: response.error.message,
        };
      }

      // Log successful email
      await prisma.emailLog.create({
        data: {
          recipientEmail: to,
          subject: template.subject,
          emailType,
          status: "sent",
          resendId: response.data?.id,
          createdById: userId,
          metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        },
      });

      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error("[EmailService] Error sending email:", errorMessage);

      // Log the error
      try {
        await prisma.emailLog.create({
          data: {
            recipientEmail: to,
            subject: template.subject,
            emailType,
            status: "failed",
            error: errorMessage,
            createdById: userId,
            metadata: metadata
              ? (metadata as Prisma.InputJsonValue)
              : undefined,
          },
        });
      } catch (logError) {
        console.error("[EmailService] Error logging email failure:", logError);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Parse notification preferences from JSON
   */
  parseNotificationPreferences(json: unknown): NotificationPreferences {
    if (!json || typeof json !== "object") {
      return {
        suggestionsCreated: true,
        suggestionsUpdated: true,
        newMemberJoined: true,
        birthdayReminders: true,
      };
    }

    const obj = json as Record<string, unknown>;
    return {
      suggestionsCreated: obj.suggestionsCreated !== false,
      suggestionsUpdated: obj.suggestionsUpdated !== false,
      newMemberJoined: obj.newMemberJoined !== false,
      birthdayReminders: obj.birthdayReminders !== false,
    };
  }

  /**
   * Check if a user should receive a particular notification type
   */
  shouldSendNotification(
    preferences: NotificationPreferences,
    notificationType:
      | "suggestionsCreated"
      | "suggestionsUpdated"
      | "newMemberJoined"
      | "birthdayReminders"
  ): boolean {
    return preferences[notificationType];
  }
}

export const emailService = new EmailService();
