import { Router, type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";

const router = Router();

const inviteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a minute before trying again." },
});

/**
 * Require a valid INVITE_API_KEY in the Authorization header.
 * Rejects with 401 if no key is configured server-side (fail-closed).
 * Rejects with 401 if the header is missing or wrong.
 */
function requireApiKey(req: any, res: any, next: any): void {
  const configuredKey = process.env.INVITE_API_KEY;
  if (!configuredKey) {
    res.status(503).json({
      error: "Email invite feature is not enabled.",
      hint: "Set the INVITE_API_KEY environment variable on the server to enable this endpoint.",
    });
    return;
  }
  const authHeader = req.headers["authorization"] ?? "";
  const providedKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!providedKey || providedKey !== configuredKey) {
    res.status(401).json({ error: "Unauthorized. A valid API key is required." });
    return;
  }
  next();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitize(str: string): string {
  return String(str).replace(/[<>"'&]/g, c =>
    ({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "&": "&amp;" }[c] ?? c)
  );
}

router.post("/send-invite", inviteLimiter, requireApiKey, async (req, res) => {
  const { name, email, jobTitle, userRole, tempPassword, dashboardUrl } = req.body ?? {};

  if (!name || !email || !tempPassword) {
    res.status(400).json({ error: "name, email, and tempPassword are required." });
    return;
  }
  if (!isValidEmail(email)) {
    res.status(400).json({ error: "Invalid email address." });
    return;
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT ?? "587");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromAddr = process.env.SMTP_FROM ?? smtpUser ?? "noreply@deploydash.local";

  if (!smtpHost || !smtpUser || !smtpPass) {
    res.status(503).json({
      error: "SMTP not configured.",
      hint: "Set SMTP_HOST, SMTP_USER, SMTP_PASS (and optionally SMTP_PORT, SMTP_FROM) env vars.",
    });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const safeUrl = dashboardUrl ? sanitize(dashboardUrl) : "";
  const safeName = sanitize(name);
  const safeEmail = sanitize(email);
  const safeRole = sanitize(userRole ?? "developer");
  const safeTitle = sanitize(jobTitle ?? "");
  const safePass = sanitize(tempPassword);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:#1e3a5f;padding:24px 32px;">
      <div style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.3px;">🚀 DeployDash</div>
      <div style="font-size:14px;color:#93c5fd;margin-top:4px;">Deployment Checklist Platform</div>
    </div>
    <div style="padding:32px;">
      <p style="font-size:18px;font-weight:600;color:#0f172a;margin:0 0 16px;">You've been invited to DeployDash</p>
      <p style="color:#475569;font-size:14px;margin:0 0 24px;">Hi <strong>${safeName}</strong>, an admin has created an account for you on DeployDash. Use the credentials below to sign in.</p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Email</div>
          <div style="font-size:15px;color:#0f172a;font-family:monospace;">${safeEmail}</div>
        </div>
        <div style="margin-bottom:12px;">
          <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Password</div>
          <div style="font-size:15px;color:#0f172a;font-family:monospace;">${safePass}</div>
        </div>
        <div style="margin-bottom:0;">
          <div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;">Role</div>
          <div style="font-size:14px;color:#0f172a;">${safeTitle ? `${safeTitle} · ` : ""}${safeRole.charAt(0).toUpperCase() + safeRole.slice(1)}</div>
        </div>
      </div>
      ${safeUrl ? `<a href="${safeUrl}" style="display:block;text-align:center;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:24px;">Open Dashboard →</a>` : ""}
      <p style="color:#94a3b8;font-size:12px;margin:0;">Please change your password after your first sign-in.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"DeployDash" <${fromAddr}>`,
      to: email,
      subject: `You've been invited to DeployDash`,
      text: `Hi ${name},\n\nYou've been invited to DeployDash.\n\nEmail: ${email}\nPassword: ${tempPassword}\n${dashboardUrl ? `\nDashboard: ${dashboardUrl}` : ""}\n\nPlease change your password after sign-in.`,
      html,
    });
    res.json({ success: true, message: "Invite email sent." });
  } catch (err: unknown) {
    // Extract as much detail as possible from the nodemailer/SMTP error
    let msg = "Unknown error";
    if (err instanceof Error) {
      const smtpErr = err as Error & { code?: string; responseCode?: number; response?: string };
      const parts: string[] = [];
      if (smtpErr.message) parts.push(smtpErr.message);
      if (smtpErr.code) parts.push(`[code: ${smtpErr.code}]`);
      if (smtpErr.responseCode) parts.push(`[SMTP ${smtpErr.responseCode}]`);
      if (smtpErr.response) parts.push(`[response: ${smtpErr.response}]`);
      msg = parts.join(" ") || "Unknown SMTP error";
    }
    res.status(502).json({ error: `Failed to send email: ${msg}` });
  }
});

export default router;
