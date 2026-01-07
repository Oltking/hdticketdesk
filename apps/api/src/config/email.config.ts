import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  mailgunApiKey: process.env.MAILGUN_API_KEY,
  mailgunDomain: process.env.MAILGUN_DOMAIN,
  mailgunHost: process.env.MAILGUN_HOST || 'api.eu.mailgun.net', // EU region default
  fromEmail: process.env.MAILGUN_FROM_EMAIL || 'noreply@hdticketdesk.com',
  fromName: process.env.MAILGUN_FROM_NAME || 'HD Ticket Desk',
}));
