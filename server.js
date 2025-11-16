// server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Resend } = require("resend");

const app = express();

// --- ENV CONFIG ---------------------------------------------------

const PORT = process.env.PORT || 8080;

// Who receives the tickets
const SUPPORT_EMAIL_TO = process.env.SUPPORT_EMAIL_TO;

// From address used by Resend
// For testing you can use: "Golpac IT <onboarding@resend.dev>"
const SUPPORT_EMAIL_FROM =
  process.env.SUPPORT_EMAIL_FROM || "Golpac IT <onboarding@resend.dev>";

// Resend API key
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!RESEND_API_KEY) {
  console.warn(
    "⚠️ RESEND_API_KEY is not set. Emails will not be sent until this is configured."
  );
}

if (!SUPPORT_EMAIL_TO) {
  console.warn(
    "⚠️ SUPPORT_EMAIL_TO is not set. You won't receive support emails."
  );
}

const resend = new Resend(RESEND_API_KEY);

// --- HELPERS: TEMPLATES -------------------------------------------

function buildTextBody({
  subject,
  description,
  hostname,
  username,
  resolvedOs,
  ipv4,
  userEmail,
  resolvedUrgency,
  resolvedVersion,
  createdAt,
  category,
  printerInfoLine,
  hasScreenshot,
}) {
  return `
New IT support request from Golpac desktop app

Subject: ${subject}
Urgency: ${resolvedUrgency}
Category: ${category || "General"}
Requester email: ${userEmail || "Not provided"}

Description:
${description}

-----------------------------
System info
-----------------------------
Computer name: ${hostname || "Unknown"}
User: ${username || "Unknown"}
OS: ${resolvedOs}
IPv4: ${ipv4 || "Unknown"}

-----------------------------
Category details
-----------------------------
${printerInfoLine ? printerInfoLine + "\n" : ""}Screenshot: ${
    hasScreenshot ? "Included" : "Not provided"
  }

-----------------------------
Meta
-----------------------------
App version: ${resolvedVersion}
Created at: ${createdAt}
`.trim();
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlBody({
  subject,
  description,
  hostname,
  username,
  resolvedOs,
  ipv4,
  userEmail,
  resolvedUrgency,
  resolvedVersion,
  createdAt,
  category,
  printerInfoLine,
  screenshotCid,
}) {
  const urgencyColor =
    resolvedUrgency === "High"
      ? "#dc2626"
      : resolvedUrgency === "Low"
      ? "#0284c7"
      : "#6b7280";

  const categoryBadge =
    category && category.toLowerCase() !== "general"
      ? `<span
           style="
             display:inline-block;
             margin-left:8px;
             padding:2px 10px;
             border-radius:999px;
             font-size:11px;
             font-weight:600;
             letter-spacing:0.03em;
             text-transform:uppercase;
             color:#374151;
             background:#e5e7eb;
           "
         >
           ${escapeHtml(category)}
         </span>`
      : "";

  const printerRow = printerInfoLine
    ? `<tr>
         <td style="font-size:13px;color:#6b7280;width:140px;">Printer info</td>
         <td style="font-size:13px;color:#111827;">
           ${escapeHtml(printerInfoLine)}
         </td>
       </tr>`
    : "";

  const screenshotSection = screenshotCid
    ? `<div
         style="
           margin-top:6px;
           border-radius:8px;
           overflow:hidden;
           border:1px solid #e5e7eb;
           background:#000;
         "
       >
         <img
           src="cid:${screenshotCid}"
           alt="Screenshot"
           style="display:block;width:100%;max-height:500px;object-fit:contain;background:#000;"
         />
       </div>`
    : `<div
         style="
           font-size:13px;
           color:#9ca3af;
           border-radius:8px;
           border:1px dashed #d1d5db;
           padding:10px 12px;
         "
       >
         No screenshot attached.
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>New IT Support Request</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
      <tr>
        <td align="center">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#ffffff;">
                <table width="100%">
                  <tr>
                    <td style="font-size:18px;font-weight:600;">
                      Golpac IT Support
                    </td>
                    <td align="right" style="font-size:12px;color:#e5e7eb;">
                      App v${escapeHtml(resolvedVersion)} · ${escapeHtml(
    createdAt
  )}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:20px;">
                <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">
                  New IT support request submitted from the Golpac desktop app.
                </p>

                <h2 style="margin:0 0 4px;font-size:18px;color:#111827;">
                  ${escapeHtml(subject)}
                  <span
                    style="
                      display:inline-block;
                      margin-left:8px;
                      padding:2px 10px;
                      border-radius:999px;
                      font-size:11px;
                      font-weight:600;
                      letter-spacing:0.03em;
                      text-transform:uppercase;
                      color:#ffffff;
                      background:${urgencyColor};
                    "
                  >
                    ${escapeHtml(resolvedUrgency)}
                  </span>
                  ${categoryBadge}
                </h2>

                <table cellpadding="0" cellspacing="0" style="width:100%;margin:10px 0 16px;">
                  <tr>
                    <td style="font-size:13px;color:#6b7280;width:140px;">Requester email</td>
                    <td style="font-size:13px;color:#111827;">
                      ${escapeHtml(userEmail || "Not provided")}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#6b7280;width:140px;">Created at</td>
                    <td style="font-size:13px;color:#111827;">
                      ${escapeHtml(createdAt)}
                    </td>
                  </tr>
                </table>

                <h3 style="margin:0 0 6px;font-size:14px;color:#111827;">Description</h3>
                <div
                  style="
                    font-size:13px;
                    color:#111827;
                    background:#f9fafb;
                    border:1px solid #e5e7eb;
                    border-radius:8px;
                    padding:10px 12px;
                    white-space:pre-wrap;
                  "
                >
                  ${escapeHtml(description)}
                </div>

                <h3 style="margin:18px 0 6px;font-size:14px;color:#111827;">System info</h3>
                <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;color:#111827;">
                  <tr>
                    <td style="padding:4px 0;color:#6b7280;width:130px;">Computer name</td>
                    <td style="padding:4px 0;">${escapeHtml(
                      hostname || "Unknown"
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#6b7280;">User</td>
                    <td style="padding:4px 0;">${escapeHtml(
                      username || "Unknown"
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#6b7280;">OS</td>
                    <td style="padding:4px 0;">${escapeHtml(resolvedOs)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#6b7280;">IPv4</td>
                    <td style="padding:4px 0;">${escapeHtml(
                      ipv4 || "Unknown"
                    )}</td>
                  </tr>
                </table>

                <h3 style="margin:18px 0 6px;font-size:14px;color:#111827;">Category details</h3>
                <table cellpadding="0" cellspacing="0" style="width:100%;font-size:13px;color:#111827;">
                  <tr>
                    <td style="padding:4px 0;color:#6b7280;width:140px;">Category</td>
                    <td style="padding:4px 0;">${escapeHtml(
                      category || "General"
                    )}</td>
                  </tr>
                  ${printerRow}
                </table>

                <h3 style="margin:18px 0 6px;font-size:14px;color:#111827;">Screenshot</h3>
                ${screenshotSection}

                <p style="margin:18px 0 0;font-size:11px;color:#9ca3af;">
                  This email was generated automatically by the Golpac IT Support desktop app.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// --- MIDDLEWARE ----------------------------------------------------

// allow up to ~10MB payload for screenshots
app.use(
  express.json({
    limit: "10mb",
  })
);
app.use(cors());

// --- ROUTES --------------------------------------------------------

app.post("/api/ticket", async (req, res) => {
  try {
    const {
      subject,
      description,
      hostname,
      username,
      osVersion,
      os_version,
      ipv4,
      userEmail,
      urgency,
      appVersion,
      timestamp,
      category,
      printerInfo,
      screenshot, // base64 string from the app (no data: prefix)
    } = req.body;

    console.log("📨 Incoming ticket payload:", {
      subject,
      description,
      userEmail,
      urgency,
      hostname,
      username,
      osVersion,
      ipv4,
      appVersion,
      timestamp,
      category,
      printerInfo: printerInfo || null,
      hasScreenshot: !!screenshot,
    });

    if (!subject || !description) {
      return res
        .status(400)
        .json({ ok: false, error: "Missing subject or description" });
    }

    if (!RESEND_API_KEY) {
      return res
        .status(500)
        .json({ ok: false, error: "Email service not configured" });
    }

    if (!SUPPORT_EMAIL_TO) {
      return res
        .status(500)
        .json({ ok: false, error: "Support email not configured" });
    }

    const resolvedOs = osVersion || os_version || "Unknown OS";
    const resolvedUrgency = urgency || "Normal";
    const createdAt = timestamp || new Date().toISOString();
    const resolvedVersion = appVersion || "unknown";
    const resolvedCategory = category || "General";

    const urgencyTag =
      resolvedUrgency && resolvedUrgency !== "Normal"
        ? `[${resolvedUrgency}] `
        : "";

    const mailSubject = `[IT Support] ${urgencyTag}${subject} - ${
      hostname || "Unknown host"
    }`;

    const printerInfoLine =
      resolvedCategory === "Printers" && printerInfo
        ? printerInfo
        : printerInfo || "";

    // Build attachments (including inline screenshot)
    const attachments = [];
    let screenshotCid = undefined;

    if (screenshot && typeof screenshot === "string" && screenshot.length > 0) {
      screenshotCid = "screenshot-inline";

      attachments.push({
        filename: "screenshot.png",
        content: screenshot, // base64 string from client
        contentType: "image/png",
        cid: screenshotCid,
      });
    }

    const textBody = buildTextBody({
      subject,
      description,
      hostname,
      username,
      resolvedOs,
      ipv4,
      userEmail,
      resolvedUrgency,
      resolvedVersion,
      createdAt,
      category: resolvedCategory,
      printerInfoLine,
      hasScreenshot: !!screenshotCid,
    });

    const htmlBody = buildHtmlBody({
      subject,
      description,
      hostname,
      username,
      resolvedOs,
      ipv4,
      userEmail,
      resolvedUrgency,
      resolvedVersion,
      createdAt,
      category: resolvedCategory,
      printerInfoLine,
      screenshotCid,
    });

    const sendResult = await resend.emails.send({
      from: SUPPORT_EMAIL_FROM,
      to: SUPPORT_EMAIL_TO,
      subject: mailSubject,
      text: textBody,
      html: htmlBody,
      attachments: attachments.length ? attachments : undefined,
    });

    if (sendResult.error) {
      console.error("❌ Resend error:", sendResult.error);
      return res
        .status(500)
        .json({ ok: false, error: "Failed to send email via Resend" });
    }

    console.log("✅ Ticket email sent via Resend:", mailSubject);
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Error sending ticket email:", err);
    res.status(500).json({ ok: false, error: "Failed to send email" });
  }
});

// --- START SERVER --------------------------------------------------

app.listen(PORT, () => {
  console.log(`📮 Golpac support backend listening on port ${PORT}`);
});
