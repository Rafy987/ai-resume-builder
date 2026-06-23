import nodemailer from "nodemailer";

// ---------------------------------------------------------------------------
// Transporter — created once, reused across all sends
// ---------------------------------------------------------------------------
// Reads all settings from environment variables.  Swap SMTP_HOST/USER/PASS
// in .env to switch between Gmail, Resend, Mailtrap, etc. — no code changes.

// Parse SMTP config — all values come from strings in process.env so we
// must convert explicitly; no coercion happens automatically.
const SMTP_PORT   = Number(process.env.SMTP_PORT) || 465;
const SMTP_SECURE = process.env.SMTP_SECURE === "true"; // "true" → true, anything else → false

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,          // true  → implicit TLS (port 465)
                                 // false → STARTTLS upgrade (port 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10_000,
  greetingTimeout:   10_000,
  socketTimeout:     15_000,
});

// ---------------------------------------------------------------------------
// verifySmtpConnection — called once at server startup
// ---------------------------------------------------------------------------

/**
 * Attempts a live SMTP handshake and logs the result.
 * Never throws — a broken SMTP config is logged but must not crash the server.
 */
const verifySmtpConnection = async () => {
  // If the three required vars aren't set yet, skip the handshake entirely
  // (keeps local dev startup clean when .env hasn't been filled in).
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("⚠️  [mail.service] SMTP vars not set — skipping connection check.");
    return;
  }

  try {
    await transporter.verify();
    console.log(
      `✅ [mail.service] SMTP connection verified — ready to send via ${process.env.SMTP_HOST}`
    );
  } catch (err) {
    console.error(
      `❌ [mail.service] SMTP connection FAILED (${process.env.SMTP_HOST}): ${err.message}`
    );
    console.error(
      "   Check SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS in your .env file."
    );
  }
};

// ---------------------------------------------------------------------------
// HTML email template — password reset
// ---------------------------------------------------------------------------

/**
 * Generates a polished dark-themed HTML email that matches the ResumeAI brand.
 *
 * @param {string} resetUrl - The full reset link the user should click
 * @param {string} userName - The recipient's display name (for personalisation)
 * @returns {string} HTML string
 */
const buildResetEmailHtml = (resetUrl, userName = "there") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password — ResumeAI</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#111827;border-radius:16px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f,#0f2744);padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;background:linear-gradient(135deg,#3b82f6,#06b6d4);
                            border-radius:10px;display:inline-block;line-height:36px;text-align:center;">
                  <span style="color:#fff;font-size:18px;font-weight:800;">R</span>
                </div>
                <span style="color:#e2e8f0;font-size:20px;font-weight:700;letter-spacing:-0.3px;">ResumeAI</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <!-- Shield icon -->
              <div style="text-align:center;margin-bottom:24px;">
                <div style="width:64px;height:64px;background:rgba(59,130,246,0.10);border:1px solid rgba(59,130,246,0.20);
                            border-radius:50%;display:inline-flex;align-items:center;justify-content:center;
                            line-height:64px;">
                  <span style="font-size:28px;">🔐</span>
                </div>
              </div>

              <h1 style="color:#e2e8f0;font-size:22px;font-weight:700;text-align:center;margin:0 0 12px;">
                Password Reset Request
              </h1>
              <p style="color:#94a3b8;font-size:15px;line-height:1.6;text-align:center;margin:0 0 28px;">
                Hi <strong style="color:#cbd5e1;">${userName}</strong>, we received a request to reset the
                password for your ResumeAI account. Click the button below to choose a new password.
              </p>

              <!-- CTA button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${resetUrl}"
                   style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#3b82f6,#06b6d4);
                          color:#fff;font-size:15px;font-weight:600;text-decoration:none;
                          border-radius:10px;box-shadow:0 4px 20px rgba(59,130,246,0.35);">
                  Reset My Password
                </a>
              </div>

              <!-- Fallback URL -->
              <p style="color:#475569;font-size:12px;text-align:center;line-height:1.6;margin:0 0 24px;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${resetUrl}" style="color:#60a5fa;word-break:break-all;">${resetUrl}</a>
              </p>

              <!-- Divider -->
              <div style="border-top:1px solid rgba(255,255,255,0.07);margin:0 0 24px;"></div>

              <!-- Warning -->
              <div style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.15);
                          border-radius:10px;padding:14px 16px;">
                <p style="color:#fca5a5;font-size:12px;margin:0;line-height:1.6;">
                  ⚠️ &nbsp;This link expires in <strong>15 minutes</strong>.
                  If you didn't request a password reset, you can safely ignore this email —
                  your account is secure.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:rgba(255,255,255,0.02);padding:20px 40px;text-align:center;
                        border-top:1px solid rgba(255,255,255,0.06);">
              <p style="color:#334155;font-size:11px;margin:0;line-height:1.6;">
                © ${new Date().getFullYear()} ResumeAI · All rights reserved<br/>
                You're receiving this because a password reset was requested for your account.
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

// ---------------------------------------------------------------------------
// sendPasswordResetEmail
// ---------------------------------------------------------------------------

/**
 * Sends a password-reset email to the user.
 *
 * @param {object} opts
 * @param {string} opts.to       - Recipient email address
 * @param {string} opts.name     - Recipient display name
 * @param {string} opts.resetUrl - Full reset URL including the token query param
 * @returns {Promise<{ sent: boolean, reason?: string }>}
 *   sent=true  → email dispatched successfully
 *   sent=false → SMTP vars missing or transport error (caller decides how to handle)
 */
const sendPasswordResetEmail = async ({ to, name, resetUrl }) => {
  // Only hard-block if the vars are genuinely absent (empty / undefined).
  // No string-matching against placeholder values — the real credentials
  // can look however the user configured them.
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      "⚠️  [mail.service] SMTP_HOST / SMTP_USER / SMTP_PASS are not set.\n" +
      `   Reset URL (for manual testing): ${resetUrl}`
    );
    return { sent: false, reason: "smtp_not_configured" };
  }

  try {
    await transporter.sendMail({
      from: `"ResumeAI" <${process.env.SMTP_USER}>`,
      to,
      subject: "Reset Your ResumeAI Password",
      html: buildResetEmailHtml(resetUrl, name),
      text:
        `Hi ${name},\n\n` +
        `We received a request to reset your ResumeAI password.\n\n` +
        `Click the link below to set a new password (expires in 15 minutes):\n${resetUrl}\n\n` +
        `If you didn't request this, you can safely ignore this email.\n\n` +
        `— The ResumeAI Team`,
    });
    console.log(`✅ [mail.service] Reset email sent to ${to}`);
    return { sent: true };
  } catch (err) {
    // Log the real SMTP error server-side; never expose internals to the client.
    console.error("❌ [mail.service] sendMail failed:", err.message);
    return { sent: false, reason: "smtp_send_failed" };
  }
};

export { transporter, verifySmtpConnection, sendPasswordResetEmail };
