import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private useSendGrid: boolean;

  constructor(private configService: ConfigService) {
    this.useSendGrid = this.configService.get('EMAIL_PROVIDER') === 'sendgrid';

    if (this.useSendGrid) {
      sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY'));
    } else {
      this.transporter = nodemailer.createTransport({
        host: this.configService.get('SMTP_HOST'),
        port: this.configService.get('SMTP_PORT'),
        secure: this.configService.get('SMTP_SECURE') === 'true',
        auth: {
          user: this.configService.get('SMTP_USER'),
          pass: this.configService.get('SMTP_PASS'),
        },
      });
    }
  }

  // ============================================
  // SEND EMAIL (GENERIC)
  // ============================================

  async sendEmail(to: string, subject: string, html: string) {
    const from = this.configService.get('EMAIL_FROM');
    const fromName = this.configService.get('EMAIL_FROM_NAME');

    try {
      if (this.useSendGrid) {
        await sgMail.send({
          to,
          from: { email: from, name: fromName },
          subject,
          html,
        });
      } else {
        await this.transporter.sendMail({
          from: `"${fromName}" <${from}>`,
          to,
          subject,
          html,
        });
      }
      
      console.log(`✉️ Email sent to ${to}: ${subject}`);
    } catch (error) {
      console.error('❌ Email send failed:', error);
      throw error;
    }
  }

  // ============================================
  // EMAIL TEMPLATES
  // ============================================

  async sendVerificationEmail(email: string, otp: string) {
    const subject = 'Verify your hdticketdesk account';
    const html = this.getVerificationTemplate(otp);
    await this.sendEmail(email, subject, html);
  }

  async sendOtpEmail(email: string, otp: string, purpose: string) {
    const subject = `hdticketdesk - ${purpose}`;
    const html = this.getOtpTemplate(otp, purpose);
    await this.sendEmail(email, subject, html);
  }

  async sendTicketEmail(
    email: string,
    ticketData: {
      eventTitle: string;
      organizerName: string;
      date: string;
      time: string;
      location: string;
      tier: string;
      qrCodeUrl: string;
      ticketNumber: string;
    },
  ) {
    const subject = `Your ticket for ${ticketData.eventTitle}`;
    const html = this.getTicketTemplate(ticketData);
    await this.sendEmail(email, subject, html);
  }

  async sendReminderEmail(
    email: string,
    ticketData: {
      eventTitle: string;
      date: string;
      time: string;
      location: string;
      qrCodeUrl: string;
    },
    hoursUntil: number,
  ) {
    const subject = `Reminder: ${ticketData.eventTitle} in ${hoursUntil} hours`;
    const html = this.getReminderTemplate(ticketData, hoursUntil);
    await this.sendEmail(email, subject, html);
  }

  // ============================================
  // TEMPLATE GENERATORS
  // ============================================

  private getVerificationTemplate(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">hdticketdesk</h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px;">Verify Your Email</h2>
                    <p style="margin: 0 0 20px; color: #4b5563; font-size: 16px; line-height: 1.6;">
                      Thank you for registering with hdticketdesk. Use the code below to verify your email address:
                    </p>
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
                      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #667eea;">${otp}</span>
                    </div>
                    <p style="margin: 20px 0 0; color: #6b7280; font-size: 14px;">
                      This code will expire in 10 minutes. If you didn't request this, please ignore this email.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">
                      © 2025 hdticketdesk. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private getOtpTemplate(otp: string, purpose: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px;">hdticketdesk</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <h2 style="margin: 0 0 20px; color: #1f2937;">${purpose}</h2>
                    <p style="margin: 0 0 30px; color: #4b5563;">Your verification code:</p>
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; display: inline-block;">
                      <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #667eea;">${otp}</span>
                    </div>
                    <p style="margin: 30px 0 0; color: #6b7280; font-size: 14px;">Expires in 10 minutes</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private getTicketTemplate(data: any): string {
    // Full ticket email template will be created separately
    // This is a placeholder for now
    return `Ticket email for ${data.eventTitle}`;
  }

  private getReminderTemplate(data: any, hours: number): string {
    return `Reminder: ${data.eventTitle} starts in ${hours} hours`;
  }
}