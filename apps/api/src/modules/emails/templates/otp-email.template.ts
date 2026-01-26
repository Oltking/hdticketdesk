export type OtpPurpose = 'LOGIN' | 'WITHDRAWAL' | 'BANK_CHANGE' | 'EMAIL_VERIFICATION';

export interface OtpEmailOptions {
  otp: string;
  purpose: OtpPurpose;
  userName?: string;
  amount?: number; // For withdrawal OTPs
}

export function getOtpEmailTemplate(
  otp: string,
  purpose: OtpPurpose = 'LOGIN',
  options?: { userName?: string; amount?: number },
): string {
  const purposeMessages: Record<
    OtpPurpose,
    { title: string; description: string; icon: string; securityNote: string }
  > = {
    LOGIN: {
      title: 'Login Verification Code',
      description:
        "You're attempting to sign in to your HD Ticket Desk account. Use the code below to complete your login:",
      icon: '🔐',
      securityNote:
        "If you didn't try to sign in, someone may be trying to access your account. Please secure your account by changing your password.",
    },
    WITHDRAWAL: {
      title: 'Withdrawal Verification Code',
      description: `You've requested a withdrawal${options?.amount ? ` of ₦${options.amount.toLocaleString()}` : ''} from your HD Ticket Desk account. Use this code to confirm:`,
      icon: '💰',
      securityNote:
        "If you didn't request this withdrawal, please contact support immediately and secure your account.",
    },
    BANK_CHANGE: {
      title: 'Bank Details Update Verification',
      description:
        "You're updating your bank account details on HD Ticket Desk. Use this code to confirm the change:",
      icon: '🏦',
      securityNote:
        "If you didn't request this change, someone may have access to your account. Please contact support immediately.",
    },
    EMAIL_VERIFICATION: {
      title: 'Verify Your Email Address',
      description:
        'Welcome to HD Ticket Desk! Please verify your email address by entering the code below:',
      icon: '✉️',
      securityNote:
        "If you didn't create an account with HD Ticket Desk, please ignore this email.",
    },
  };

  const { title, description, icon, securityNote } = purposeMessages[purpose];
  const greeting = options?.userName ? `Hi ${options.userName},` : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title} - HD Ticket Desk</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Your verification code is ${otp}. Valid for 10 minutes.
  </div>
  
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">${icon} HD Ticket Desk</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #333333;">${greeting}</p>
              <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 16px; font-weight: 600;">${title}</h2>
              <p style="color: #4b5563; margin: 0 0 24px; font-size: 15px; line-height: 1.6;">${description}</p>
              
              <!-- OTP Code Box -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', monospace;">${otp}</p>
              </div>
              
              <!-- Expiry Notice -->
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  ⏱️ This code expires in <strong>10 minutes</strong>. Don't share it with anyone.
                </p>
              </div>
              
              <!-- Security Notice -->
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px;">
                <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                  <strong>🔒 Security Notice:</strong> ${securityNote}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-radius: 0 0 16px 16px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #666666;">
                      Need help? Contact us at
                    </p>
                    <p style="margin: 4px 0 0;">
                      <a href="mailto:support@hdticketdesk.com" style="color: #667eea; text-decoration: none; font-weight: 500;">support@hdticketdesk.com</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 16px;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
                      <a href="https://hdticketdesk.com" style="color: #667eea; text-decoration: none;">Website</a> &nbsp;•&nbsp;
                      <a href="https://x.com/hdticketdesk" style="color: #667eea; text-decoration: none;">Twitter</a> &nbsp;•&nbsp;
                      <a href="https://hdticketdesk.com/about" style="color: #667eea; text-decoration: none;">About</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                      © ${new Date().getFullYear()} HD Ticket Desk. All rights reserved.<br>
                      <a href="https://hdticketdesk.com/privacy" style="color: #9ca3af; text-decoration: underline;">Privacy Policy</a> &nbsp;•&nbsp;
                      <a href="https://hdticketdesk.com/terms" style="color: #9ca3af; text-decoration: underline;">Terms of Service</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Physical Address (for anti-spam compliance) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                This is an automated message from HD Ticket Desk.<br>
                HD Ticket Desk, Lagos, Nigeria
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
