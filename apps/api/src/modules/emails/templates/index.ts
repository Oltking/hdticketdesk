export * from './otp-email.template';
export * from './verification-email.template';
export * from './ticket-email.template';

// Reminder Email Template
export interface ReminderEmailData {
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  ticketNumber: string;
  qrCodeUrl: string;
  hoursUntil: number;
  isOnline?: boolean;
  onlineLink?: string;
  buyerName?: string;
}

export function getReminderEmailTemplate(data: ReminderEmailData): string {
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
  const greeting = data.buyerName ? `Hi ${data.buyerName},` : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Event Reminder - ${data.eventTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    Reminder: ${data.eventTitle} is ${timeText}! Don't forget your ticket.
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 500px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 32px; text-align: center; background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #fff; font-size: 24px;">⏰ Event Reminder!</h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">HD Ticket Desk</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #333;">${greeting}</p>
              <p style="font-size: 16px; color: #333; line-height: 1.5;">
                Your event <strong>${data.eventTitle}</strong> is <strong style="color: #ff6b6b;">${timeText}</strong>!
              </p>
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <p style="margin: 0 0 12px;"><strong>📅 Date:</strong> ${formattedDate}</p>
                <p style="margin: 0 0 12px;"><strong>📍 Location:</strong> ${data.isOnline ? `<a href="${data.onlineLink}" style="color: #667eea;">Join Online Event</a>` : data.eventLocation}</p>
                <p style="margin: 0;"><strong>🎫 Ticket:</strong> ${data.ticketNumber}</p>
              </div>
              <div style="text-align: center; margin: 24px 0; padding: 20px; background: #f8f9fa; border-radius: 12px; border: 2px dashed #e0e0e0;">
                <p style="margin: 0 0 12px; font-size: 12px; color: #666; text-transform: uppercase;">Your Entry QR Code</p>
                <img src="${data.qrCodeUrl}" alt="QR Code" width="150" height="150" style="width: 150px; height: 150px; border: 4px solid #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              </div>
              <div style="background: #fff8e1; border-radius: 8px; padding: 16px; border-left: 4px solid #ffc107;">
                <p style="margin: 0; font-size: 13px; color: #856404;">
                  💡 <strong>Tip:</strong> Have your QR code ready on your phone or printed. Arrive 15 minutes early!
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 12px; font-size: 13px; color: #666; text-align: center;">
                Need help? <a href="mailto:support@hdticketdesk.com" style="color: #667eea;">support@hdticketdesk.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #999; text-align: center;">
                © ${new Date().getFullYear()} HD Ticket Desk. All rights reserved.<br>
                <a href="https://hdticketdesk.com" style="color: #999;">Website</a> • 
                <a href="https://x.com/hdticketdesk" style="color: #999;">Twitter</a> • 
                <a href="https://hdticketdesk.com/privacy" style="color: #999;">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 24px 0 0; font-size: 11px; color: #999; text-align: center;">
          HD Ticket Desk, Lagos, Nigeria
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Refund Email Template
export interface RefundEmailData {
  eventTitle: string;
  ticketNumber: string;
  refundAmount: number;
  status: 'approved' | 'rejected' | 'completed' | 'requested';
  reason?: string;
  buyerName?: string;
}

export function getRefundEmailTemplate(data: RefundEmailData): string {
  const statusConfig = {
    requested: {
      bg: '#e0f2fe',
      color: '#0369a1',
      icon: '📝',
      title: 'Refund Requested',
      message: 'Your refund request has been submitted and is pending review.',
    },
    approved: {
      bg: '#d1fae5',
      color: '#065f46',
      icon: '✅',
      title: 'Refund Approved',
      message: 'Great news! Your refund request has been approved.',
    },
    rejected: {
      bg: '#fee2e2',
      color: '#991b1b',
      icon: '❌',
      title: 'Refund Declined',
      message: 'Unfortunately, your refund request could not be approved.',
    },
    completed: {
      bg: '#dbeafe',
      color: '#1e40af',
      icon: '💰',
      title: 'Refund Completed',
      message: 'Your refund has been processed and sent to your account.',
    },
  };
  const config = statusConfig[data.status];
  const formattedAmount = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(data.refundAmount);
  const greeting = data.buyerName ? `Hi ${data.buyerName},` : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Refund ${config.title} - HD Ticket Desk</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${config.title}: ${formattedAmount} for ${data.eventTitle}
  </div>
  <table role="presentation" width="100%" style="padding: 40px 20px; background: #f5f5f5;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 500px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 24px; color: #fff;">🎫 HD Ticket Desk</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #333;">${greeting}</p>
              
              <div style="background: ${config.bg}; color: ${config.color}; padding: 20px; border-radius: 12px; margin: 0 0 24px; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 32px;">${config.icon}</p>
                <p style="margin: 0; font-size: 18px; font-weight: 600;">${config.title}</p>
              </div>
              
              <p style="margin: 0 0 24px; font-size: 15px; color: #555; line-height: 1.5;">${config.message}</p>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8e8e8;">
                      <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Event</p>
                      <p style="margin: 4px 0 0; font-size: 15px; color: #333; font-weight: 500;">${data.eventTitle}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8e8e8;">
                      <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Ticket Number</p>
                      <p style="margin: 4px 0 0; font-size: 15px; color: #333; font-weight: 500;">${data.ticketNumber}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Refund Amount</p>
                      <p style="margin: 4px 0 0; font-size: 18px; color: #333; font-weight: 700;">${formattedAmount}</p>
                    </td>
                  </tr>
                </table>
              </div>
              
              ${
                data.reason
                  ? `
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 13px; color: #92400e;">
                  <strong>Note:</strong> ${data.reason}
                </p>
              </div>
              `
                  : ''
              }
              
              ${
                data.status === 'completed'
                  ? `
              <div style="background: #d1fae5; border-radius: 8px; padding: 16px; margin-top: 16px;">
                <p style="margin: 0; font-size: 13px; color: #065f46;">
                  💳 The refund should appear in your original payment method within 5-10 business days.
                </p>
              </div>
              `
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 12px; font-size: 13px; color: #666; text-align: center;">
                Questions? <a href="mailto:support@hdticketdesk.com" style="color: #667eea;">support@hdticketdesk.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #999; text-align: center;">
                © ${new Date().getFullYear()} HD Ticket Desk. All rights reserved.<br>
                <a href="https://hdticketdesk.com" style="color: #999;">Website</a> • 
                <a href="https://x.com/hdticketdesk" style="color: #999;">Twitter</a> • 
                <a href="https://hdticketdesk.com/refunds" style="color: #999;">Refund Policy</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 24px 0 0; font-size: 11px; color: #999; text-align: center;">
          HD Ticket Desk, Lagos, Nigeria
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Withdrawal Email Template
export interface WithdrawalEmailData {
  amount: number;
  bankName: string;
  accountNumber: string;
  status: 'processing' | 'completed' | 'failed' | 'pending';
  failureReason?: string;
  organizerName?: string;
  reference?: string;
}

export function getWithdrawalEmailTemplate(data: WithdrawalEmailData): string {
  const statusConfig = {
    pending: {
      bg: '#e0f2fe',
      color: '#0369a1',
      icon: '📝',
      title: 'Withdrawal Initiated',
      message: 'Your withdrawal request has been received and is awaiting verification.',
    },
    processing: {
      bg: '#fef3c7',
      color: '#92400e',
      icon: '⏳',
      title: 'Withdrawal Processing',
      message: 'Your withdrawal is being processed and will be sent to your bank shortly.',
    },
    completed: {
      bg: '#d1fae5',
      color: '#065f46',
      icon: '✅',
      title: 'Withdrawal Successful',
      message: 'Your withdrawal has been completed and sent to your bank account.',
    },
    failed: {
      bg: '#fee2e2',
      color: '#991b1b',
      icon: '❌',
      title: 'Withdrawal Failed',
      message: 'Unfortunately, your withdrawal could not be processed.',
    },
  };
  const config = statusConfig[data.status];
  const formattedAmount = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(data.amount);
  const maskedAccount = '****' + data.accountNumber.slice(-4);
  const greeting = data.organizerName ? `Hi ${data.organizerName},` : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${config.title} - HD Ticket Desk</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5;">
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${config.title}: ${formattedAmount} to ${data.bankName}
  </div>
  <table role="presentation" width="100%" style="padding: 40px 20px; background: #f5f5f5;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 500px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 24px; color: #fff;">💰 HD Ticket Desk</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #333;">${greeting}</p>
              
              <div style="background: ${config.bg}; color: ${config.color}; padding: 20px; border-radius: 12px; margin: 0 0 24px; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 32px;">${config.icon}</p>
                <p style="margin: 0; font-size: 18px; font-weight: 600;">${config.title}</p>
              </div>
              
              <p style="margin: 0 0 24px; font-size: 15px; color: #555; line-height: 1.5;">${config.message}</p>
              
              <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8e8e8;">
                      <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Amount</p>
                      <p style="margin: 4px 0 0; font-size: 24px; color: #333; font-weight: 700;">${formattedAmount}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e8e8e8;">
                      <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Bank</p>
                      <p style="margin: 4px 0 0; font-size: 15px; color: #333; font-weight: 500;">${data.bankName}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; ${data.reference ? 'border-bottom: 1px solid #e8e8e8;' : ''}">
                      <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Account</p>
                      <p style="margin: 4px 0 0; font-size: 15px; color: #333; font-weight: 500;">${maskedAccount}</p>
                    </td>
                  </tr>
                  ${
                    data.reference
                      ? `
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; font-size: 12px; color: #999; text-transform: uppercase;">Reference</p>
                      <p style="margin: 4px 0 0; font-size: 13px; color: #333; font-family: monospace;">${data.reference}</p>
                    </td>
                  </tr>
                  `
                      : ''
                  }
                </table>
              </div>
              
              ${
                data.failureReason
                  ? `
              <div style="background: #fee2e2; border-radius: 8px; padding: 16px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; font-size: 13px; color: #991b1b;">
                  <strong>Reason:</strong> ${data.failureReason}
                </p>
              </div>
              `
                  : ''
              }
              
              ${
                data.status === 'completed'
                  ? `
              <div style="background: #d1fae5; border-radius: 8px; padding: 16px; margin-top: 16px;">
                <p style="margin: 0; font-size: 13px; color: #065f46;">
                  ✨ Funds should reflect in your account within 24 hours depending on your bank.
                </p>
              </div>
              `
                  : ''
              }
              
              ${
                data.status === 'failed'
                  ? `
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 16px;">
                <p style="margin: 0; font-size: 13px; color: #92400e;">
                  💡 Please verify your bank details and try again, or contact support if the issue persists.
                </p>
              </div>
              `
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 12px; font-size: 13px; color: #666; text-align: center;">
                Questions? <a href="mailto:support@hdticketdesk.com" style="color: #667eea;">support@hdticketdesk.com</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #999; text-align: center;">
                © ${new Date().getFullYear()} HD Ticket Desk. All rights reserved.<br>
                <a href="https://hdticketdesk.com" style="color: #999;">Website</a> • 
                <a href="https://x.com/hdticketdesk" style="color: #999;">Twitter</a> • 
                <a href="https://hdticketdesk.com/privacy" style="color: #999;">Privacy</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 24px 0 0; font-size: 11px; color: #999; text-align: center;">
          HD Ticket Desk, Lagos, Nigeria
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
