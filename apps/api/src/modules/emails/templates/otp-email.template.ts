export type OtpPurpose = 'LOGIN' | 'WITHDRAWAL' | 'BANK_CHANGE' | 'EMAIL_VERIFICATION';

export function getOtpEmailTemplate(otp: string, purpose: OtpPurpose = 'LOGIN'): string {
  const purposeMessages: Record<OtpPurpose, { title: string; description: string }> = {
    LOGIN: {
      title: 'Login Verification',
      description: 'Use this code to complete your login:',
    },
    WITHDRAWAL: {
      title: 'Withdrawal Confirmation',
      description: 'Use this code to confirm your withdrawal request:',
    },
    BANK_CHANGE: {
      title: 'Bank Details Update',
      description: 'Use this code to confirm your bank details change:',
    },
    EMAIL_VERIFICATION: {
      title: 'Email Verification',
      description: 'Use this code to verify your email address:',
    },
  };

  const { title, description } = purposeMessages[purpose];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
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
              <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 16px;">${title}</h1>
              <p style="color: #4b5563; margin-bottom: 24px;">${description}</p>
              <div style="background: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed;">${otp}</span>
              </div>
              <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, please ignore this email.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} hdticketdesk. All rights reserved.
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
