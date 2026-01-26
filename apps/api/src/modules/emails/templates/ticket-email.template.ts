export interface TicketEmailData {
  ticketNumber: string;
  eventTitle: string;
  eventDate: Date;
  eventEndDate?: Date;
  eventLocation: string;
  eventLatitude?: number | null;
  eventLongitude?: number | null;
  tierName: string;
  tierPrice: number;
  buyerName: string;
  buyerEmail: string;
  qrCodeUrl: string;
  isOnline?: boolean;
  onlineLink?: string;
  eventDescription?: string;
  organizerName?: string;
  quantity?: number;
}

export function getTicketEmailTemplate(data: TicketEmailData): string {
  const formattedDate = new Intl.DateTimeFormat('en-NG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }).format(new Date(data.eventDate));

  const formattedEndDate = data.eventEndDate
    ? new Intl.DateTimeFormat('en-NG', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Africa/Lagos',
      }).format(new Date(data.eventEndDate))
    : null;

  const formattedPrice = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(data.tierPrice);

  const totalPrice = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(data.tierPrice * (data.quantity || 1));

  // Generate Google Maps URL
  const getGoogleMapsUrl = () => {
    if (data.eventLatitude && data.eventLongitude) {
      return `https://www.google.com/maps/search/?api=1&query=${data.eventLatitude},${data.eventLongitude}`;
    }
    if (data.eventLocation) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.eventLocation)}`;
    }
    return null;
  };

  const googleMapsUrl = getGoogleMapsUrl();

  const locationSection = data.isOnline
    ? `<tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Event Type</p>
          <p style="margin: 0; font-size: 15px; color: #1a1a1a; font-weight: 500;">🌐 Online Event</p>
        </td>
      </tr>
      ${
        data.onlineLink
          ? `<tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Join Link</p>
          <p style="margin: 0; font-size: 15px;"><a href="${data.onlineLink}" style="color: #667eea; text-decoration: none; font-weight: 500;">Click here to join the event</a></p>
        </td>
      </tr>`
          : ''
      }`
    : `<tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Venue</p>
          <p style="margin: 0; font-size: 15px; color: #1a1a1a; font-weight: 500;">📍 ${data.eventLocation}</p>
          ${googleMapsUrl ? `<p style="margin: 8px 0 0 0;"><a href="${googleMapsUrl}" style="display: inline-block; padding: 8px 16px; background-color: #4285f4; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 500; border-radius: 6px;">📍 View on Google Maps</a></p>` : ''}
        </td>
      </tr>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Your Ticket for ${data.eventTitle}</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .button {padding: 12px 24px !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased;">
  <!-- Preheader text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    Your ticket for ${data.eventTitle} is confirmed! Ticket #${data.ticketNumber}
  </div>
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff;">🎫 Ticket Confirmed!</h1>
              <p style="margin: 0; font-size: 14px; color: rgba(255,255,255,0.9);">HD Ticket Desk</p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 32px 0;">
              <p style="margin: 0; font-size: 16px; color: #333333;">Hi ${data.buyerName},</p>
              <p style="margin: 12px 0 0; font-size: 15px; color: #555555; line-height: 1.5;">
                Thank you for your purchase! Your ticket${(data.quantity || 1) > 1 ? 's are' : ' is'} confirmed. Below are your event details and QR code for entry.
              </p>
            </td>
          </tr>
          
          <!-- QR Code -->
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <div style="background-color: #f8f9fa; border-radius: 12px; padding: 24px; border: 2px dashed #e0e0e0;">
                <p style="margin: 0 0 16px; font-size: 13px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">Present this QR code at entry</p>
                <img src="${data.qrCodeUrl}" alt="Ticket QR Code" width="180" height="180" style="width: 180px; height: 180px; border: 8px solid #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <p style="margin: 16px 0 0; font-size: 16px; color: #1a1a1a; font-weight: 700; font-family: monospace; letter-spacing: 1px;">${data.ticketNumber}</p>
              </div>
            </td>
          </tr>
          
          <!-- Event Details -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px;">
                <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #1a1a1a;">${data.eventTitle}</h2>
                
                ${data.eventDescription ? `<p style="margin: 0 0 16px; font-size: 14px; color: #666666; line-height: 1.5;">${data.eventDescription.substring(0, 200)}${data.eventDescription.length > 200 ? '...' : ''}</p>` : ''}
                
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
                      <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Attendee</p>
                      <p style="margin: 0; font-size: 15px; color: #1a1a1a; font-weight: 500;">${data.buyerName}</p>
                      <p style="margin: 4px 0 0; font-size: 13px; color: #666666;">${data.buyerEmail}</p>
                    </td>
                  </tr>
                  ${
                    data.organizerName
                      ? `<tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
                      <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Organized by</p>
                      <p style="margin: 0; font-size: 15px; color: #1a1a1a; font-weight: 500;">${data.organizerName}</p>
                    </td>
                  </tr>`
                      : ''
                  }
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
                      <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Date & Time</p>
                      <p style="margin: 0; font-size: 15px; color: #1a1a1a; font-weight: 500;">📅 ${formattedDate}</p>
                      ${formattedEndDate ? `<p style="margin: 4px 0 0; font-size: 13px; color: #666666;">Until: ${formattedEndDate}</p>` : ''}
                    </td>
                  </tr>
                  ${locationSection}
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e8e8e8;">
                      <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Ticket Type</p>
                      <span style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 20px;">${data.tierName}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0;">
                      <p style="margin: 0 0 4px; font-size: 12px; color: #999999; text-transform: uppercase;">Price${(data.quantity || 1) > 1 ? ` (${data.quantity} tickets)` : ''}</p>
                      <p style="margin: 0; font-size: 15px; color: #1a1a1a; font-weight: 500;">${data.tierPrice === 0 ? 'FREE' : totalPrice}</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 24px; text-align: center;">
              <a href="https://hdticketdesk.com/tickets" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 28px; border-radius: 8px;">View My Tickets</a>
            </td>
          </tr>
          
          <!-- Important Notice -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #fff8e1; border-radius: 8px; padding: 16px; border-left: 4px solid #ffc107;">
                <p style="margin: 0 0 8px; font-size: 14px; color: #856404; font-weight: 600;">Important Information</p>
                <ul style="margin: 0; padding-left: 16px; font-size: 13px; color: #856404; line-height: 1.6;">
                  <li>Have this QR code ready on your phone or printed for entry</li>
                  <li>Arrive at least 15 minutes before the event starts</li>
                  <li>This ticket is non-transferable and linked to your account</li>
                  ${data.isOnline ? '<li>For online events, test your internet connection beforehand</li>' : ''}
                </ul>
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
                      Questions about your ticket? We're here to help!
                    </p>
                    <p style="margin: 8px 0 0;">
                      <a href="mailto:support@hdticketdesk.com" style="color: #667eea; text-decoration: none; font-weight: 500;">support@hdticketdesk.com</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="text-align: center; border-top: 1px solid #e8e8e8; padding-top: 16px;">
                    <p style="margin: 0 0 8px; font-size: 12px; color: #999999;">
                      <a href="https://hdticketdesk.com" style="color: #667eea; text-decoration: none;">Website</a> &nbsp;•&nbsp;
                      <a href="https://x.com/hdticketdesk" style="color: #667eea; text-decoration: none;">Twitter</a> &nbsp;•&nbsp;
                      <a href="https://hdticketdesk.com/about" style="color: #667eea; text-decoration: none;">About Us</a>
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #999999;">
                      © ${new Date().getFullYear()} HD Ticket Desk. All rights reserved.<br>
                      <a href="https://hdticketdesk.com/privacy" style="color: #999999; text-decoration: underline;">Privacy Policy</a> &nbsp;•&nbsp;
                      <a href="https://hdticketdesk.com/terms" style="color: #999999; text-decoration: underline;">Terms of Service</a> &nbsp;•&nbsp;
                      <a href="https://hdticketdesk.com/refunds" style="color: #999999; text-decoration: underline;">Refund Policy</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Physical Address (for anti-spam compliance) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px;">
          <tr>
            <td style="padding: 24px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #999999;">
                You received this email because you purchased a ticket on HD Ticket Desk.<br>
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
