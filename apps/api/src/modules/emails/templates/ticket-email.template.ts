export function getTicketEmailTemplate(data: {
  ticketNumber: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  tierName: string;
  buyerName: string;
  qrCodeUrl: string;
  isOnline?: boolean;
  onlineLink?: string;
}): string {
  const formattedDate = new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }).format(new Date(data.eventDate));

  const locationText = data.isOnline 
    ? `<a href="${data.onlineLink}" style="color: #667eea; text-decoration: none;">Join Online Event</a>`
    : data.eventLocation;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Ticket - ${data.eventTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff;">🎫 Ticket Confirmed!</h1>
              <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9);">HD Ticket Desk</p>
            </td>
          </tr>
          
          <!-- QR Code -->
          <tr>
            <td style="padding: 32px; text-align: center; border-bottom: 1px dashed #e0e0e0;">
              <p style="margin: 0 0 16px; font-size: 13px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">Scan this QR code at entry</p>
              <img src="${data.qrCodeUrl}" alt="Ticket QR Code" style="width: 180px; height: 180px; border: 8px solid #f5f5f5; border-radius: 8px;">
              <p style="margin: 16px 0 0; font-size: 14px; color: #1a1a1a; font-weight: 600;">${data.ticketNumber}</p>
            </td>
          </tr>
          
          <!-- Event Details -->
          <tr>
            <td style="padding: 24px 32px;">
              <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #1a1a1a;">${data.eventTitle}</h2>
              
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Attendee</p>
                    <p style="margin: 0; font-size: 15px; color: #1a1a1a; font-weight: 500;">${data.buyerName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Date & Time</p>
                    <p style="margin: 0; font-size: 15px; color: #1a1a1a; font-weight: 500;">📅 ${formattedDate}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Location</p>
                    <p style="margin: 0; font-size: 15px; color: #1a1a1a; font-weight: 500;">📍 ${locationText}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Ticket Type</p>
                    <span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 20px;">${data.tierName}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Important Notice -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #fff8e1; border-radius: 8px; padding: 16px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; font-size: 13px; color: #856404;">
                  <strong>Important:</strong> Please have this QR code ready on your phone or printed for entry. Screenshot this email or add it to your wallet.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 12px; font-size: 12px; color: #999999; text-align: center;">
                Need help? <a href="mailto:support@hdticketdesk.com" style="color: #667eea; text-decoration: none;">Contact Support</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #999999; text-align: center;">
                © ${new Date().getFullYear()} HD Ticket Desk. All rights reserved.<br>
                <a href="#" style="color: #667eea; text-decoration: none;">Privacy Policy</a> • 
                <a href="#" style="color: #667eea; text-decoration: none;">Refund Policy</a>
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
