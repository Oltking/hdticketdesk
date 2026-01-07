export function getVerificationEmailTemplate(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1a1a1a;">🎫 HD Ticket Desk</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #1a1a1a;">Welcome! Verify Your Email</h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                Thank you for joining HD Ticket Desk! To complete your registration and start using our platform, please verify your email address.
              </p>
              
              <!-- OTP Code Box -->
              <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 8px;">${code}</p>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 14px; color: #666666;">This code will expire in <strong>10 minutes</strong>.</p>
              
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <p style="margin: 0; font-size: 13px; color: #666666;">
                  <strong>What you can do after verification:</strong>
                </p>
                <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 13px; color: #666666;">
                  <li>Create and publish events</li>
                  <li>Purchase tickets to amazing events</li>
                  <li>Manage your organizer profile</li>
                </ul>
              </div>
              
              <p style="margin: 0; font-size: 13px; color: #999999;">If you didn't create an account with HD Ticket Desk, please ignore this email.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                © ${new Date().getFullYear()} HD Ticket Desk. All rights reserved.<br>
                <a href="#" style="color: #11998e; text-decoration: none;">Privacy Policy</a> • 
                <a href="#" style="color: #11998e; text-decoration: none;">Terms of Service</a>
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
