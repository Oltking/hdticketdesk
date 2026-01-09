import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as FormData from 'form-data';
import Mailgun from 'mailgun.js';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private mg: any;
  private domain: string;
  private fromEmail: string;
  private fromName: string;
  private frontendUrl: string;

  constructor(private configService: ConfigService) {
    /* ==================== READ CONFIG FIRST ==================== */
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
    const domain = this.configService.get<string>('MAILGUN_DOMAIN');
    const mailgunHost =
      this.configService.get<string>('MAILGUN_HOST') ?? 'api.eu.mailgun.net';

    /* ==================== HARD FAIL (NO SILENT MISCONFIG) ==================== */
    if (!apiKey) throw new Error('MAILGUN_API_KEY is missing');
    if (!domain) throw new Error('MAILGUN_DOMAIN is missing');

    this.domain = domain;

    this.fromEmail =
      this.configService.get<string>('MAILGUN_FROM_EMAIL') ??
      `noreply@${domain}`;

    this.fromName =
      this.configService.get<string>('MAILGUN_FROM_NAME') ??
      'HD Ticket Desk';

    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ??
      'http://localhost:3000';

    /* ==================== DOMAIN ↔ FROM SAFETY CHECK ==================== */
    // Mailgun WILL reject mismatched domains
    if (!this.fromEmail.endsWith(`@${this.domain}`)) {
      throw new Error(
        `MAILGUN_FROM_EMAIL (${this.fromEmail}) must match MAILGUN_DOMAIN (${this.domain})`,
      );
    }

    /* ==================== INIT MAILGUN AFTER VALIDATION ==================== */
    const mailgun = new Mailgun(FormData);

    this.mg = mailgun.client({
      username: 'api',
      key: apiKey,
      url: `https://${mailgunHost}`,
    });

    /* ==================== BOOT LOGS ==================== */
    this.logger.log('Mailgun initialized');
    this.logger.log(`Domain: ${this.domain}`);
    this.logger.log(`Host: ${mailgunHost}`);
    this.logger.log(`From: ${this.from}`);
  }

  /* ==================== RFC-SAFE FROM HEADER ==================== */
  private get from(): string {
    // QUOTED name prevents header parsing issues
    return `"${this.fromName}" <${this.fromEmail}>`;
  }

  // ==================== VERIFICATION OTP EMAIL (NEW) ====================
  async sendVerificationOtp(to: string, otp: string, firstName?: string) {
    const html = this.getEmailTemplate({
      title: 'Verify Your Email',
      preheader: 'Your verification code for hdticketdesk',
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">Welcome to hdticketdesk!</h1>
        <p style="color: #4b5563; margin-bottom: 24px;">${firstName ? `Hi ${firstName}, ` : ''}Enter this code to verify your email address and activate your account.</p>
        
        <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 8px 0;">Your verification code</p>
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: white; font-family: 'Courier New', monospace;">${otp}</span>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>⏱️ This code expires in 10 minutes.</strong>
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">If you didn't create an account on hdticketdesk, you can safely ignore this email.</p>
      `,
    });

    return this.send(to, 'Verify Your Email - hdticketdesk', html);
  }

  // ==================== VERIFICATION EMAIL (Link Version) ====================
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

  // ==================== OTP EMAIL (Login) ====================
  async sendOtpEmail(to: string, otp: string) {
    const html = this.getEmailTemplate({
      title: 'Your Login OTP',
      preheader: 'Your one-time password for hdticketdesk',
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">New Device Login</h1>
        <p style="color: #4b5563; margin-bottom: 24px;">We detected a login from a new device. Use this code to verify it's you:</p>
        
        <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 8px 0;">Your login code</p>
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: white; font-family: 'Courier New', monospace;">${otp}</span>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>⏱️ This code expires in 10 minutes.</strong>
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px;">If you didn't try to login, please secure your account by changing your password.</p>
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
        <p style="color: #4b5563; margin-bottom: 24px;">You requested to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Reset Password</a>
        </div>
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>⏱️ This link expires in 1 hour.</strong>
          </p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
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
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">🎉 Ticket Confirmed!</h1>
        <p style="color: #6b7280; margin-bottom: 24px;">Hi ${data.buyerName}, your ticket is ready. See you at the event!</p>
        
        <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px;">
          <h2 style="font-size: 20px; margin: 0 0 16px 0; font-weight: 700;">${data.eventTitle}</h2>
          <table style="width: 100%;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 4px 0;">
                <span style="opacity: 0.9;">📅 ${formattedDate}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">
                ${data.isOnline 
                  ? '<span style="opacity: 0.9;">💻 Online Event</span>' 
                  : `<span style="opacity: 0.9;">📍 ${data.eventLocation}</span>`
                }
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 0;">
                <span style="opacity: 0.9;">🎟️ ${data.tierName}</span>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; background: #f9fafb; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">Scan this QR code at the venue</p>
          <img src="${data.qrCodeUrl}" alt="QR Code" style="width: 180px; height: 180px; border-radius: 8px; border: 4px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />
          <p style="color: #7c3aed; font-size: 16px; font-weight: 600; margin: 16px 0 0 0; font-family: 'Courier New', monospace;">#${data.ticketNumber}</p>
        </div>
        
        ${data.isOnline && data.onlineLink ? `
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="color: #065f46; font-size: 14px; margin: 0 0 8px 0;"><strong>🔗 Join Online</strong></p>
          <a href="${data.onlineLink}" style="color: #10b981; word-break: break-all;">${data.onlineLink}</a>
        </div>
        ` : ''}
        
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px;">
          <p style="color: #6b7280; font-size: 12px; margin: 0;">
            <strong>💡 Tips:</strong> Save this email or take a screenshot of the QR code. You'll need it for entry.
          </p>
        </div>
      `,
    });

    return this.send(to, `Your Ticket for ${data.eventTitle} - hdticketdesk`, html);
  }

  // ==================== EVENT REMINDER EMAIL ====================
  async sendEventReminderEmail(
    to: string,
    data: {
      ticketNumber: string;
      eventTitle: string;
      eventDate: Date;
      eventLocation: string;
      buyerName: string;
      qrCodeUrl: string;
      hoursUntil: number;
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

    const timeLabel = data.hoursUntil <= 2 ? 'Starting Soon!' : 'Tomorrow!';

    const html = this.getEmailTemplate({
      title: `Reminder: ${data.eventTitle}`,
      preheader: `Your event is ${timeLabel.toLowerCase()}`,
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">⏰ Event ${timeLabel}</h1>
        <p style="color: #6b7280; margin-bottom: 24px;">Hi ${data.buyerName}, don't forget about your upcoming event!</p>
        
        <div style="background: linear-gradient(135deg, #f59e0b, #f97316); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px;">
          <h2 style="font-size: 20px; margin: 0 0 16px 0; font-weight: 700;">${data.eventTitle}</h2>
          <p style="opacity: 0.9; margin: 4px 0;">📅 ${formattedDate}</p>
          <p style="opacity: 0.9; margin: 4px 0;">📍 ${data.eventLocation}</p>
        </div>
        
        <div style="text-align: center; background: #f9fafb; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 16px 0;">Your ticket QR code</p>
          <img src="${data.qrCodeUrl}" alt="QR Code" style="width: 160px; height: 160px; border-radius: 8px;" />
          <p style="color: #7c3aed; font-size: 14px; font-weight: 600; margin: 12px 0 0 0;">#${data.ticketNumber}</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center;">See you there! 🎉</p>
      `,
    });

    return this.send(to, `Reminder: ${data.eventTitle} is ${timeLabel} - hdticketdesk`, html);
  }

  // ==================== REFUND EMAIL ====================
  async sendRefundEmail(
    to: string,
    data: {
      ticketNumber: string;
      eventTitle: string;
      refundAmount: number;
      status: 'requested' | 'approved' | 'rejected' | 'processed';
      reason?: string;
      buyerName?: string;
    },
  ) {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(data.refundAmount);

    let statusHtml = '';
    let subject = '';
    let emoji = '';

    switch (data.status) {
      case 'requested':
        emoji = '📝';
        statusHtml = `
          <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <strong style="color: #1e40af;">📝 Refund Requested</strong>
            <p style="color: #1e40af; margin: 8px 0 0 0;">Your refund request of ${formattedAmount} has been submitted and is awaiting review.</p>
          </div>
        `;
        subject = 'Refund Request Received';
        break;
      case 'approved':
        emoji = '✅';
        statusHtml = `
          <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <strong style="color: #065f46;">✅ Refund Approved</strong>
            <p style="color: #065f46; margin: 8px 0 0 0;">Your refund of ${formattedAmount} has been approved and is being processed.</p>
          </div>
        `;
        subject = 'Refund Approved';
        break;
      case 'rejected':
        emoji = '❌';
        statusHtml = `
          <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <strong style="color: #991b1b;">❌ Refund Rejected</strong>
            <p style="color: #991b1b; margin: 8px 0 0 0;">${data.reason || 'Your refund request was not approved by the organizer.'}</p>
          </div>
        `;
        subject = 'Refund Request Update';
        break;
      case 'processed':
        emoji = '💰';
        statusHtml = `
          <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <strong style="color: #065f46;">💰 Refund Processed</strong>
            <p style="color: #065f46; margin: 8px 0 0 0;">${formattedAmount} has been refunded to your original payment method. Please allow 3-5 business days for the funds to appear.</p>
          </div>
        `;
        subject = 'Refund Processed';
        break;
    }

    const html = this.getEmailTemplate({
      title: `${emoji} ${subject}`,
      preheader: `Refund update for ${data.eventTitle}`,
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">${data.buyerName ? `Hi ${data.buyerName}, ` : ''}Refund Update</h1>
        ${statusHtml}
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <table style="width: 100%;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; color: #4b5563; border-bottom: 1px solid #e5e7eb;">
                <strong>Event</strong>
              </td>
              <td style="padding: 8px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb; text-align: right;">
                ${data.eventTitle}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #4b5563; border-bottom: 1px solid #e5e7eb;">
                <strong>Ticket</strong>
              </td>
              <td style="padding: 8px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb; text-align: right;">
                #${data.ticketNumber}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #4b5563;">
                <strong>Amount</strong>
              </td>
              <td style="padding: 8px 0; color: #7c3aed; font-weight: 600; text-align: right;">
                ${formattedAmount}
              </td>
            </tr>
          </table>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you have any questions, please contact the event organizer or our support team.</p>
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
      status: 'success' | 'failed' | 'pending';
      reason?: string;
      organizerName?: string;
    },
  ) {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(data.amount);

    const maskedAccount = `****${data.accountNumber.slice(-4)}`;

    let statusHtml = '';
    let subject = '';

    switch (data.status) {
      case 'pending':
        statusHtml = `
          <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <strong style="color: #1e40af;">⏳ Withdrawal Processing</strong>
            <p style="color: #1e40af; margin: 8px 0 0 0;">Your withdrawal of ${formattedAmount} is being processed.</p>
          </div>
        `;
        subject = 'Withdrawal Processing';
        break;
      case 'success':
        statusHtml = `
          <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <strong style="color: #065f46;">✅ Withdrawal Successful</strong>
            <p style="color: #065f46; margin: 8px 0 0 0;">${formattedAmount} has been sent to your bank account.</p>
          </div>
        `;
        subject = 'Withdrawal Successful';
        break;
      case 'failed':
        statusHtml = `
          <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <strong style="color: #991b1b;">❌ Withdrawal Failed</strong>
            <p style="color: #991b1b; margin: 8px 0 0 0;">${data.reason || 'The withdrawal could not be processed. Please verify your bank details and try again.'}</p>
          </div>
        `;
        subject = 'Withdrawal Failed';
        break;
    }

    const html = this.getEmailTemplate({
      title: subject,
      preheader: `Withdrawal ${data.status} - ${formattedAmount}`,
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">${data.organizerName ? `Hi ${data.organizerName}, ` : ''}Withdrawal Update</h1>
        ${statusHtml}
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <table style="width: 100%;" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding: 8px 0; color: #4b5563; border-bottom: 1px solid #e5e7eb;">
                <strong>Amount</strong>
              </td>
              <td style="padding: 8px 0; color: #7c3aed; font-weight: 600; border-bottom: 1px solid #e5e7eb; text-align: right;">
                ${formattedAmount}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #4b5563; border-bottom: 1px solid #e5e7eb;">
                <strong>Bank</strong>
              </td>
              <td style="padding: 8px 0; color: #1f2937; border-bottom: 1px solid #e5e7eb; text-align: right;">
                ${data.bankName}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #4b5563;">
                <strong>Account</strong>
              </td>
              <td style="padding: 8px 0; color: #1f2937; text-align: right;">
                ${maskedAccount}
              </td>
            </tr>
          </table>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you have any questions about this withdrawal, please contact our support team.</p>
      `,
    });

    return this.send(to, `${subject} - hdticketdesk`, html);
  }

  // ==================== WITHDRAWAL OTP ====================
  async sendWithdrawalOtpEmail(to: string, otp: string, amount: number) {
    const formattedAmount = new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);

    const html = this.getEmailTemplate({
      title: 'Confirm Withdrawal',
      preheader: `Confirm your withdrawal of ${formattedAmount}`,
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">Confirm Withdrawal</h1>
        <p style="color: #4b5563; margin-bottom: 16px;">You requested a withdrawal of <strong style="color: #7c3aed;">${formattedAmount}</strong>.</p>
        <p style="color: #4b5563; margin-bottom: 24px;">Enter this code to confirm the withdrawal:</p>
        
        <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
          <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 8px 0;">Your confirmation code</p>
          <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: white; font-family: 'Courier New', monospace;">${otp}</span>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            <strong>⏱️ This code expires in 10 minutes.</strong>
          </p>
        </div>
        
        <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
          <p style="color: #991b1b; font-size: 14px; margin: 0;">
            <strong>⚠️ Security Warning:</strong> If you didn't request this withdrawal, please change your password immediately and contact support.
          </p>
        </div>
      `,
    });

    return this.send(to, 'Confirm Your Withdrawal - hdticketdesk', html);
  }

  // ==================== WELCOME EMAIL ====================
  async sendWelcomeEmail(to: string, firstName: string, role: 'BUYER' | 'ORGANIZER') {
    const html = this.getEmailTemplate({
      title: 'Welcome to hdticketdesk! 🎉',
      preheader: 'Your account is ready',
      content: `
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 8px;">Welcome, ${firstName}! 🎉</h1>
        <p style="color: #6b7280; margin-bottom: 24px;">Your hdticketdesk account is now active and ready to use.</p>
        
        ${role === 'ORGANIZER' ? `
        <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin: 0 0 16px 0;">🎫 Start Selling Tickets</h2>
          <ul style="margin: 0; padding-left: 20px; opacity: 0.9;">
            <li style="margin-bottom: 8px;">Create your first event</li>
            <li style="margin-bottom: 8px;">Add ticket tiers and pricing</li>
            <li style="margin-bottom: 8px;">Share with your audience</li>
            <li>Track sales in your dashboard</li>
          </ul>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${this.frontendUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
        </div>
        ` : `
        <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 16px; padding: 24px; color: white; margin-bottom: 24px;">
          <h2 style="font-size: 18px; margin: 0 0 16px 0;">🎉 Discover Amazing Events</h2>
          <ul style="margin: 0; padding-left: 20px; opacity: 0.9;">
            <li style="margin-bottom: 8px;">Browse events near you</li>
            <li style="margin-bottom: 8px;">Get tickets instantly</li>
            <li style="margin-bottom: 8px;">Receive your QR code by email</li>
            <li>Manage all your tickets in one place</li>
          </ul>
        </div>
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="${this.frontendUrl}/events" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">Explore Events</a>
        </div>
        `}
        
        <p style="color: #6b7280; font-size: 14px; text-align: center;">Need help? Just reply to this email - we're here for you!</p>
      `,
    });

    return this.send(to, 'Welcome to hdticketdesk! 🎉', html);
  }

  // ==================== HELPERS ====================
  private async send(to: string, subject: string, html: string) {
    try {
      if (!this.domain) {
        console.error('[EMAIL] MAILGUN_DOMAIN not configured:', this.domain);
        return { success: false, error: 'MAILGUN_DOMAIN not configured' };
      }

      if (!this.mg) {
        console.error('[EMAIL] Mailgun client not initialized');
        return { success: false, error: 'Mailgun client not initialized' };
      }

      console.log(`[EMAIL] Attempting to send email to: ${to}`);
      console.log(`[EMAIL] From: ${this.from}`);
      console.log(`[EMAIL] Domain: ${this.domain}`);

      const response = await this.mg.messages.create(this.domain, {
        from: this.from,
        to: [to],
        subject,
        html,
      });

      console.log(`[EMAIL] Successfully sent to ${to}: ${subject}`, response.id);
      return { success: true, messageId: response.id };
    } catch (error) {
      console.error('[EMAIL] Send failed:', {
        error: error instanceof Error ? error.message : String(error),
        domain: this.domain,
        from: this.from,
        to: to,
      });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
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
              <a href="${this.frontendUrl}" style="text-decoration: none;">
                <span style="font-size: 24px; font-weight: bold; color: #7c3aed;">🎟️ hdticketdesk</span>
              </a>
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
              <p style="margin: 16px 0 0 0;">
                <a href="${this.frontendUrl}/privacy" style="color: #7c3aed; font-size: 12px; text-decoration: none; margin: 0 8px;">Privacy</a>
                <a href="${this.frontendUrl}/terms" style="color: #7c3aed; font-size: 12px; text-decoration: none; margin: 0 8px;">Terms</a>
                <a href="${this.frontendUrl}/help" style="color: #7c3aed; font-size: 12px; text-decoration: none; margin: 0 8px;">Help</a>
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