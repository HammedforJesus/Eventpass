import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface SentEmailRecord {
  id: string;
  eventId: string;
  guestId?: string;
  invitationId?: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  passUrl: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  deliveryMode: 'SMTP' | 'ETHEREAL' | 'SIMULATED';
  previewUrl?: string | null;
  messageId?: string;
  error?: string | null;
  sentAt: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

// In-memory store + file backup for sent emails
const sentEmails: SentEmailRecord[] = [];
const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const DATA_FILE = path.join(DATA_DIR, 'sent_emails.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create data directory:', e);
    }
  }
}

// Load persisted emails on boot
try {
  ensureDataDir();
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      sentEmails.push(...parsed);
    }
  }
} catch (e) {
  console.warn('Could not load sent emails history:', e);
}

function persistEmails() {
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(sentEmails.slice(-200), null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not persist sent emails:', e);
  }
}

// Optional runtime custom SMTP configuration
let runtimeSmtpConfig: SmtpConfig | null = null;
const SMTP_CONFIG_FILE = path.join(DATA_DIR, 'smtp_config.json');

try {
  ensureDataDir();
  if (fs.existsSync(SMTP_CONFIG_FILE)) {
    const raw = fs.readFileSync(SMTP_CONFIG_FILE, 'utf-8');
    runtimeSmtpConfig = JSON.parse(raw);
  }
} catch (e) {
  console.warn('Could not load SMTP config:', e);
}

export function getActiveSmtpConfig(): SmtpConfig | null {
  if (runtimeSmtpConfig && runtimeSmtpConfig.host && runtimeSmtpConfig.user) {
    return runtimeSmtpConfig;
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || `EVENTPASS <${process.env.SMTP_USER}>`,
    };
  }
  return null;
}

export function saveRuntimeSmtpConfig(config: SmtpConfig | null) {
  runtimeSmtpConfig = config;
  try {
    ensureDataDir();
    if (config) {
      fs.writeFileSync(SMTP_CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
    } else if (fs.existsSync(SMTP_CONFIG_FILE)) {
      fs.unlinkSync(SMTP_CONFIG_FILE);
    }
  } catch (e) {
    console.warn('Could not save SMTP config:', e);
  }
}

// Cache test account so we don't recreate it every send
let etherealTransporter: nodemailer.Transporter | null = null;
let etherealInitPromise: Promise<nodemailer.Transporter | null> | null = null;

async function getEtherealTransporter(): Promise<nodemailer.Transporter | null> {
  if (etherealTransporter) return etherealTransporter;
  if (!etherealInitPromise) {
    etherealInitPromise = (async () => {
      try {
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        etherealTransporter = transporter;
        console.log('✔ Ethereal test email account initialized for automated invitation delivery:', testAccount.user);
        return transporter;
      } catch (err) {
        console.warn('Could not create Ethereal test account, falling back to simulated transport:', err);
        return null;
      }
    })();
  }
  return etherealInitPromise;
}

export interface InvitationEmailPayload {
  eventId: string;
  eventName: string;
  eventDescription?: string | null;
  venue: string;
  address: string;
  startDateTime: Date | string;
  guestId?: string;
  invitationId?: string;
  guestName: string;
  guestEmail: string;
  guestCategory?: string;
  plusOne?: number;
  passUrl: string;
  verificationCode?: string;
}

export function buildInvitationHtml(payload: InvitationEmailPayload): string {
  const formattedDate = new Date(payload.startDateTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = new Date(payload.startDateTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Invitation to ${payload.eventName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 15px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #18181b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Header Bar -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #18181b 0%, #27272a 100%); border-bottom: 1px solid #27272a;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 10px; border-radius: 6px;">
                      Official Pass
                    </span>
                    <h1 style="margin: 12px 0 0 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em; line-height: 1.25;">
                      ${payload.eventName}
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #e4e4e7; line-height: 1.5;">
                Hello <strong>${payload.guestName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
                You have been registered for <strong>${payload.eventName}</strong>. Your personalized digital entrance pass is ready. Please view your pass and add it to your mobile device for fast gate check-in.
              </p>

              <!-- Event Details Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <!-- Date & Time -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">📅</td>
                        <td>
                          <div style="font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 700;">Date & Time</div>
                          <div style="font-size: 14px; color: #f4f4f5; font-weight: 600; margin-top: 2px;">
                            ${formattedDate} &bull; ${formattedTime}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Venue -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">📍</td>
                        <td>
                          <div style="font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 700;">Venue & Location</div>
                          <div style="font-size: 14px; color: #f4f4f5; font-weight: 600; margin-top: 2px;">
                            ${payload.venue}
                          </div>
                          <div style="font-size: 12px; color: #a1a1aa; margin-top: 2px;">
                            ${payload.address}
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Attendee Status -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="28" valign="top" style="font-size: 16px;">🎟️</td>
                        <td>
                          <div style="font-size: 11px; color: #71717a; text-transform: uppercase; font-weight: 700;">Access Tier</div>
                          <div style="font-size: 13px; color: #f4f4f5; font-weight: 600; margin-top: 2px;">
                            ${payload.guestCategory || 'Regular'} ${payload.plusOne ? `(+${payload.plusOne} Guest)` : ''}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Big Primary CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${payload.passUrl}" target="_blank" style="display: block; background-color: #3b82f6; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 12px; text-align: center; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                      View & Confirm Digital Pass &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a; text-align: center;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px 0; font-size: 11px; color: #3b82f6; word-break: break-all; text-align: center; font-family: monospace;">
                <a href="${payload.passUrl}" style="color: #60a5fa; text-decoration: underline;">${payload.passUrl}</a>
              </p>

              <!-- Security Notice -->
              <div style="background-color: rgba(39, 39, 42, 0.5); border: 1px dashed #3f3f46; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                🔒 <strong>Entry Instruction:</strong> When you arrive at the gate, staff will scan your digital QR pass. Please keep this email accessible or save the pass to your home screen.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #121215; border-top: 1px solid #27272a; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #71717a;">
                Powered by <strong>EVENTPASS</strong> &bull; Secure Real-time Event Management
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

export function buildInvitationPlainText(payload: InvitationEmailPayload): string {
  const formattedDate = new Date(payload.startDateTime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = new Date(payload.startDateTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
Hi ${payload.guestName},

You are officially invited to: ${payload.eventName}!

EVENT DETAILS:
Date & Time: ${formattedDate} at ${formattedTime}
Venue: ${payload.venue}, ${payload.address}
Tier: ${payload.guestCategory || 'Regular'} ${payload.plusOne ? `(+${payload.plusOne} Guest)` : ''}

ACCESS YOUR DIGITAL PASS & GATE QR CODE:
${payload.passUrl}

Please open this link to confirm your RSVP and view your QR code for rapid check-in at the gate.

See you at the event!
Powered by EVENTPASS
  `.trim();
}

/**
 * Dispatch an invitation email.
 * If SMTP is configured, sends real email over network.
 * If Ethereal is available, generates live test inbox URL.
 * Always logs to the internal outbox so organizers can view, preview, or 1-click share via Gmail/WhatsApp/SMS.
 */
export async function sendInvitationEmail(payload: InvitationEmailPayload): Promise<{
  success: boolean;
  deliveryMode: 'SMTP' | 'ETHEREAL' | 'SIMULATED';
  messageId?: string;
  previewUrl?: string | null;
  error?: string;
}> {
  const subject = `🎟️ Your Invitation to ${payload.eventName}`;
  const html = buildInvitationHtml(payload);
  const text = buildInvitationPlainText(payload);

  const smtpConfig = getActiveSmtpConfig();
  const emailId = 'email_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // 1. Try real custom or environment SMTP if present
  if (smtpConfig) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });

      const info = await transporter.sendMail({
        from: smtpConfig.from || `"EVENTPASS" <${smtpConfig.user}>`,
        to: payload.guestEmail,
        subject,
        text,
        html,
      });

      const record: SentEmailRecord = {
        id: emailId,
        eventId: payload.eventId,
        guestId: payload.guestId,
        invitationId: payload.invitationId,
        recipientEmail: payload.guestEmail,
        recipientName: payload.guestName,
        subject,
        htmlContent: html,
        textContent: text,
        passUrl: payload.passUrl,
        status: 'SENT',
        deliveryMode: 'SMTP',
        messageId: info.messageId,
        sentAt: new Date().toISOString(),
      };
      sentEmails.unshift(record);
      persistEmails();

      console.log(`✔ Real SMTP email sent to ${payload.guestEmail} via ${smtpConfig.host}:`, info.messageId);
      return {
        success: true,
        deliveryMode: 'SMTP',
        messageId: info.messageId,
      };
    } catch (smtpErr: any) {
      console.warn(`⚠ SMTP delivery to ${payload.guestEmail} failed, falling back:`, smtpErr.message);
    }
  }

  // 2. Try Ethereal test service
  try {
    const ethereal = await getEtherealTransporter();
    if (ethereal) {
      const info = await ethereal.sendMail({
        from: `"EVENTPASS" <invitations@eventpass.io>`,
        to: payload.guestEmail,
        subject,
        text,
        html,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || null;

      const record: SentEmailRecord = {
        id: emailId,
        eventId: payload.eventId,
        guestId: payload.guestId,
        invitationId: payload.invitationId,
        recipientEmail: payload.guestEmail,
        recipientName: payload.guestName,
        subject,
        htmlContent: html,
        textContent: text,
        passUrl: payload.passUrl,
        status: 'SENT',
        deliveryMode: 'ETHEREAL',
        messageId: info.messageId,
        previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
        sentAt: new Date().toISOString(),
      };
      sentEmails.unshift(record);
      persistEmails();

      console.log(`✔ Invitation dispatched for ${payload.guestEmail} (Ethereal test preview: ${previewUrl})`);
      return {
        success: true,
        deliveryMode: 'ETHEREAL',
        messageId: info.messageId,
        previewUrl: typeof previewUrl === 'string' ? previewUrl : null,
      };
    }
  } catch (etherealErr: any) {
    console.warn('Ethereal dispatch failed, using simulated outbox:', etherealErr.message);
  }

  // 3. Fallback: Store in local outbox
  const record: SentEmailRecord = {
    id: emailId,
    eventId: payload.eventId,
    guestId: payload.guestId,
    invitationId: payload.invitationId,
    recipientEmail: payload.guestEmail,
    recipientName: payload.guestName,
    subject,
    htmlContent: html,
    textContent: text,
    passUrl: payload.passUrl,
    status: 'SIMULATED',
    deliveryMode: 'SIMULATED',
    messageId: `sim_${Date.now()}`,
    sentAt: new Date().toISOString(),
  };
  sentEmails.unshift(record);
  persistEmails();

  return {
    success: true,
    deliveryMode: 'SIMULATED',
    messageId: record.messageId,
  };
}

export function getSentEmailsForEvent(eventId: string): SentEmailRecord[] {
  return sentEmails.filter((e) => e.eventId === eventId);
}

export function getSentEmailById(emailId: string): SentEmailRecord | undefined {
  return sentEmails.find((e) => e.id === emailId);
}
