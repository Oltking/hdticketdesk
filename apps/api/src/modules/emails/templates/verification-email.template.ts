export function getVerificationEmailTemplate(code: string, userName?: string): string {
  const greeting = userName ? `Hi ${userName},` : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Verify Your Email - HD Ticket Desk</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Welcome to HD Ticket Desk! Your verification code is ${code}. Valid for 10 minutes.
  </div>
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">🎫 HD Ticket Desk</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: rgba(255,255,255,0.9);">Welcome aboard!</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #333333;">${greeting}</p>
              <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #1a1a1a;">Verify Your Email Address</h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #4a4a4a;">
                Thank you for joining HD Ticket Desk! To complete your registration and start using our platform, please enter the verification code below.
              </p>
              
              <!-- OTP Code Box -->
              <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 1px;">Your verification code</p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; color: #ffffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</p>
              </div>
              
              <!-- Expiry Notice -->
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  ⏱️ This code expires in <strong>10 minutes</strong>. Don't share it with anyone.
                </p>
              </div>
              
              <!-- Benefits Section -->
              <div style="background-color: #f0fdf4; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #bbf7d0;">
                <p style="margin: 0 0 12px; font-size: 14px; color: #166534; font-weight: 600;">
                  🎉 What you can do after verification:
                </p>
                <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #166534; line-height: 1.8;">
                  <li>Discover and attend amazing events</li>
                  <li>Purchase tickets securely</li>
                  <li>Create and publish your own events</li>
                  <li>Manage ticket sales and track earnings</li>
                </ul>
              </div>
              
              <!-- Security Notice -->
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px;">
                <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">
                  🔒 If you didn't create an account with HD Ticket Desk, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #f0f0f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center; padding-bottom: 16px;">
                    <p style="margin: 0; font-size: 13px; color: #666666;">
                      Need help getting started?
                    </p>
                    <p style="margin: 4px 0 0;">
                      <a href="mailto:support@hdticketdesk.com" style="color: #11998e; text-decoration: none; font-weight: 500;">support@hdticketdesk.com</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; border-top: 1px solid #e8e8e8; padding-top: 16px;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
                      <a href="https://hdticketdesk.com" style="color: #11998e; text-decoration: none;">Website</a> &nbsp;•&nbsp;
                      <a href="https://x.com/hdticketdesk" style="color: #11998e; text-decoration: none;">Twitter</a> &nbsp;•&nbsp;
                      <a href="https://hdticketdesk.com/about" style="color: #11998e; text-decoration: none;">About Us</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #999999;">
                      © ${new Date().getFullYear()} HD Ticket Desk. All rights reserved.<br>
                      <a href="https://hdticketdesk.com/privacy" style="color: #999999; text-decoration: underline;">Privacy Policy</a> &nbsp;•&nbsp;
                      <a href="https://hdticketdesk.com/terms" style="color: #999999; text-decoration: underline;">Terms of Service</a>
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
              <p style="margin: 0; font-size: 11px; color: #999999;">
                You received this email because you created an account on HD Ticket Desk.<br>
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
  `;
}
