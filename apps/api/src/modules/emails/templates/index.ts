export * from './otp-email.template';
export * from './verification-email.template';
export * from './ticket-email.template';

// Reminder Email Template
export function getReminderEmailTemplate(data: {
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  ticketNumber: string;
  qrCodeUrl: string;
  hoursUntil: number;
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

  const timeText = data.hoursUntil === 24 ? 'tomorrow' : 'in just 2 hours';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 500px; background: #fff; border-radius: 12px;">
          <tr>
            <td style="padding: 32px; text-align: center; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #fff;">⏰ Event Reminder!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="font-size: 16px; color: #333;">Hey! Your event <strong>${data.eventTitle}</strong> is ${timeText}.</p>
              <p><strong>📅 Date:</strong> ${formattedDate}</p>
              <p><strong>📍 Location:</strong> ${data.isOnline ? 'Online Event' : data.eventLocation}</p>
              <p><strong>🎫 Ticket:</strong> ${data.ticketNumber}</p>
              <div style="text-align: center; margin: 24px 0;">
                <img src="${data.qrCodeUrl}" alt="QR Code" style="width: 150px; height: 150px; border: 4px solid #f0f0f0; border-radius: 8px;">
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; background: #fafafa; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #999;">© ${new Date().getFullYear()} HD Ticket Desk</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Refund Email Template
export function getRefundEmailTemplate(data: {
  eventTitle: string;
  ticketNumber: string;
  refundAmount: number;
  status: 'approved' | 'rejected' | 'completed';
  reason?: string;
}): string {
  const statusColors = {
    approved: { bg: '#d4edda', color: '#155724', icon: '✅' },
    rejected: { bg: '#f8d7da', color: '#721c24', icon: '❌' },
    completed: { bg: '#cce5ff', color: '#004085', icon: '💰' },
  };
  const style = statusColors[data.status];
  const formattedAmount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(data.refundAmount);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
  <table width="100%" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 500px; background: #fff; border-radius: 12px;">
          <tr>
            <td style="padding: 32px; text-align: center;">
              <h1 style="margin: 0 0 8px;">🎫 HD Ticket Desk</h1>
              <div style="background: ${style.bg}; color: ${style.color}; padding: 16px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0; font-size: 18px;">${style.icon} Refund ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>
              </div>
              <p><strong>Event:</strong> ${data.eventTitle}</p>
              <p><strong>Ticket:</strong> ${data.ticketNumber}</p>
              <p><strong>Amount:</strong> ${formattedAmount}</p>
              ${data.reason ? `<p><strong>Note:</strong> ${data.reason}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; background: #fafafa; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #999;">© ${new Date().getFullYear()} HD Ticket Desk</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Withdrawal Email Template
export function getWithdrawalEmailTemplate(data: {
  amount: number;
  bankName: string;
  accountNumber: string;
  status: 'processing' | 'completed' | 'failed';
  failureReason?: string;
}): string {
  const statusColors = {
    processing: { bg: '#fff3cd', color: '#856404', icon: '⏳' },
    completed: { bg: '#d4edda', color: '#155724', icon: '✅' },
    failed: { bg: '#f8d7da', color: '#721c24', icon: '❌' },
  };
  const style = statusColors[data.status];
  const formattedAmount = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(data.amount);
  const maskedAccount = '****' + data.accountNumber.slice(-4);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
  <table width="100%" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 500px; background: #fff; border-radius: 12px;">
          <tr>
            <td style="padding: 32px; text-align: center;">
              <h1 style="margin: 0 0 8px;">🎫 HD Ticket Desk</h1>
              <div style="background: ${style.bg}; color: ${style.color}; padding: 16px; border-radius: 8px; margin: 24px 0;">
                <p style="margin: 0; font-size: 18px;">${style.icon} Withdrawal ${data.status.charAt(0).toUpperCase() + data.status.slice(1)}</p>
              </div>
              <p><strong>Amount:</strong> ${formattedAmount}</p>
              <p><strong>Bank:</strong> ${data.bankName}</p>
              <p><strong>Account:</strong> ${maskedAccount}</p>
              ${data.failureReason ? `<p style="color: #dc3545;"><strong>Reason:</strong> ${data.failureReason}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; background: #fafafa; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #999;">© ${new Date().getFullYear()} HD Ticket Desk</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
