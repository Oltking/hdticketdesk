import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as FormData from 'form-data';
import Mailgun from 'mailgun.js';

@Injectable()
export class EmailService {
  private mg: any;
  private domain: string;
  private fromEmail: string;
  private fromName: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    const mailgun = new Mailgun(FormData);
    
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY') || '';
    
    this.mg = mailgun.client({
      username: 'api',
      key: apiKey || 'dummy-key-for-dev',
    });

    this.domain = this.configService.get<string>('MAILGUN_DOMAIN') || '';
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@hdticketdesk.com';
    this.fromName = this.configService.get<string>('EMAIL_FROM_NAME') || 'hdticketdesk';
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private get from(): string {
    return `${this.fromName} <${this.fromEmail}>`;
  }

  // ==================== VERIFICATION EMAIL ====================
  async sendVerificationEmail(to: string, token: string) {
    const verifyUrl = `${this.frontendUrl}/verify-email?token=${token}`;

    const html = this.getEmailTemplate({
      title: 'Verify Your Email',
      preheader: 'Complete your hdticketdesk registration',
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Welcome to hdticketdesk!</h1>
        <p style="color: #4b5563; margin-bottom: 24px;">Please verify your email address to complete your registration.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify Email</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">This link expires in 24 hours.</p>
      `,
    });

    return this.send(to, 'Verify Your Email - hdticketdesk', html);
  }

  // ==================== OTP EMAIL ====================
  async sendOtpEmail(to: string, otp: string) {
    const html = this.getEmailTemplate({
      title: 'Your Login OTP',
      preheader: 'Your one-time password for hdticketdesk',
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Login Verification</h1>
        <p style="color: #4b5563; margin-bottom: 24px;">Use this code to complete your login:</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
      `,
    });

    return this.send(to, 'Your Login OTP - hdticketdesk', html);
  }

  // ==================== PASSWORD RESET ====================
  async sendPasswordResetEmail(to: string, token: string) {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;

    const html = this.getEmailTemplate({
      title: 'Reset Your Password',
      preheader: 'Password reset request for hdticketdesk',
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Password Reset</h1>
        <p style="color: #4b5563; margin-bottom: 24px;">Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
      `,
    });

    return this.send(to, 'Reset Your Password - hdticketdesk', html);
  }

  // ==================== TICKET EMAIL ====================
  async sendTicketEmail(
    to: string,
    data: {
      ticketNumber: string;
      eventTitle: string;
      eventDate: Date;
      eventLocation: string;
      tierName: string;
      buyerName: string;
      qrCodeUrl: string;
      isOnline?: boolean;
      onlineLink?: string;
    },
  ) {
    const formattedDate = data.eventDate.toLocaleDateString('en-NG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    const html = this.getEmailTemplate({
      title: 'Your Ticket is Confirmed! 🎉',
      preheader: `Ticket for ${data.eventTitle}`,
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">Ticket Confirmed!</h1>
        <p style="color: #6b7280; margin-bottom: 24px;">Hi ${data.buyerName}, your ticket is ready.</p>
        
        <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px;">
          <h2 style="font-size: 20px; margin-bottom: 8px;">${data.eventTitle}</h2>
          <p style="opacity: 0.9;">📅 ${formattedDate}</p>
          ${data.isOnline ? '<p style="opacity: 0.9;">📍 Online Event</p>' : `<p style="opacity: 0.9;">📍 ${data.eventLocation}</p>`}
          <p style="opacity: 0.9; margin-top: 8px;">🎟️ ${data.tierName}</p>
        </div>
        
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="${data.qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; border-radius: 8px;" />
          <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Ticket #${data.ticketNumber}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center;">Show this QR code at the venue for entry.</p>
      `,
    });

    return this.send(to, `Your Ticket for ${data.eventTitle} - hdticketdesk`, html);
  }

  // ==================== REFUND EMAIL ====================
  async sendRefundEmail(
    to: string,
    data: {
      ticketNumber: string;
      eventTitle: string;
      refundAmount: number;
      status: 'approved' | 'rejected' | 'processed';
      reason?: string;
    },
  ) {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(data.refundAmount);

    let statusHtml = '';
    let subject = '';

    switch (data.status) {
      case 'approved':
        statusHtml = `
          <div style="background: #d1fae5; color: #065f46; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <strong>✅ Refund Approved</strong>
            <p style="margin: 8px 0 0 0;">Your refund of ${formattedAmount} has been approved and is being processed.</p>
          </div>
        `;
        subject = 'Refund Approved';
        break;
      case 'rejected':
        statusHtml = `
          <div style="background: #fee2e2; color: #991b1b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <strong>❌ Refund Rejected</strong>
            <p style="margin: 8px 0 0 0;">${data.reason || 'Your refund request was not approved.'}</p>
          </div>
        `;
        subject = 'Refund Request Update';
        break;
      case 'processed':
        statusHtml = `
          <div style="background: #d1fae5; color: #065f46; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <strong>✅ Refund Processed</strong>
            <p style="margin: 8px 0 0 0;">${formattedAmount} has been refunded to your original payment method.</p>
          </div>
        `;
        subject = 'Refund Processed';
        break;
    }

    const html = this.getEmailTemplate({
      title: subject,
      preheader: `Refund update for ${data.eventTitle}`,
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Refund Update</h1>
        ${statusHtml}
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #4b5563; margin: 0;"><strong>Event:</strong> ${data.eventTitle}</p>
          <p style="color: #4b5563; margin: 8px 0 0 0;"><strong>Ticket:</strong> ${data.ticketNumber}</p>
          <p style="color: #4b5563; margin: 8px 0 0 0;"><strong>Amount:</strong> ${formattedAmount}</p>
        </div>
      `,
    });

    return this.send(to, `${subject} - hdticketdesk`, html);
  }

  // ==================== WITHDRAWAL EMAIL ====================
  async sendWithdrawalEmail(
    to: string,
    data: {
      amount: number;
      bankName: string;
      accountNumber: string;
      status: 'success' | 'failed';
      reason?: string;
    },
  ) {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(data.amount);

    const maskedAccount = `****${data.accountNumber.slice(-4)}`;

    const statusHtml =
      data.status === 'success'
        ? `<div style="background: #d1fae5; color: #065f46; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <strong>✅ Withdrawal Successful</strong>
            <p style="margin: 8px 0 0 0;">${formattedAmount} has been sent to your account.</p>
          </div>`
        : `<div style="background: #fee2e2; color: #991b1b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
            <strong>❌ Withdrawal Failed</strong>
            <p style="margin: 8px 0 0 0;">${data.reason || 'Please try again or contact support.'}</p>
          </div>`;

    const html = this.getEmailTemplate({
      title: data.status === 'success' ? 'Withdrawal Successful' : 'Withdrawal Failed',
      preheader: `Withdrawal ${data.status} - ${formattedAmount}`,
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Withdrawal Update</h1>
        ${statusHtml}
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="color: #4b5563; margin: 0;"><strong>Amount:</strong> ${formattedAmount}</p>
          <p style="color: #4b5563; margin: 8px 0 0 0;"><strong>Bank:</strong> ${data.bankName}</p>
          <p style="color: #4b5563; margin: 8px 0 0 0;"><strong>Account:</strong> ${maskedAccount}</p>
        </div>
      `,
    });

    return this.send(to, `Withdrawal ${data.status === 'success' ? 'Successful' : 'Failed'} - hdticketdesk`, html);
  }

  // ==================== WITHDRAWAL OTP ====================
  async sendWithdrawalOtpEmail(to: string, otp: string, amount: number) {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);

    const html = this.getEmailTemplate({
      title: 'Withdrawal OTP',
      preheader: `Confirm your withdrawal of ${formattedAmount}`,
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Withdrawal Confirmation</h1>
        <p style="color: #4b5563; margin-bottom: 16px;">You requested a withdrawal of <strong>${formattedAmount}</strong>.</p>
        <p style="color: #4b5563; margin-bottom: 24px;">Use this OTP to confirm:</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't request this withdrawal, please contact support immediately.</p>
      `,
    });

    return this.send(to, 'Confirm Your Withdrawal - hdticketdesk', html);
  }

  // ==================== HELPERS ====================
  private async send(to: string, subject: string, html: string) {
    try {
      if (!this.domain) {
        console.log(`[EMAIL] Would send to ${to}: ${subject}`);
        return { success: true, message: 'Email logged (no domain configured)' };
      }

      await this.mg.messages.create(this.domain, {
        from: this.from,
        to: [to],
        subject,
        html,
      });

      return { success: true };
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error };
    }
  }

  private getEmailTemplate(data: { title: string; preheader: string; content: string }) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <span style="display: none !important; visibility: hidden; mso-hide: all; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${data.preheader}</span>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 24px; font-weight: bold; color: #7c3aed;">🎟️ hdticketdesk</span>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${data.content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} hdticketdesk. All rights reserved.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 8px 0 0 0;">
                Africa's Premier Event Ticketing Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}
