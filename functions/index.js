const { onRequest } = require("firebase-functions/v2/https");
const { defineString } = require("firebase-functions/params");
const { Resend } = require("resend");

// Define the API key parameter
// This will be prompted for during deployment if not set
const resendKeyParam = defineString("RESEND_KEY");

/**
 * HTTP Cloud Function to send emails
 * Endpoint: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/sendEmail
 */
exports.sendEmail = onRequest({
    cors: true,
    invoker: "public",
}, async (req, res) => {
    // Only allow POST requests
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    // Initialize Resend with the parameter value
    const apiKey = resendKeyParam.value();
    if (!apiKey) {
        console.error("Resend API key not configured!");
        return res.status(500).json({
            error: "Email service not configured. RESEND_KEY parameter is missing.",
        });
    }
    const resend = new Resend(apiKey);

    try {
        const { to, cc, subject, html } = req.body;

        // Validate required fields
        if (!to || !subject || !html) {
            return res.status(400).json({
                error: "Missing required fields: to, subject, html",
            });
        }

        console.log("Sending email to:", to);
        if (cc) console.log("CC:", cc);
        console.log("Subject:", subject);

        // Send email using Resend
        const payload = {
            from: "noreply@notifications.engsight.app",
            to: Array.isArray(to) ? to : [to],
            subject: subject,
            html: html,
        };

        if (cc) {
            payload.cc = Array.isArray(cc) ? cc : [cc];
        }

        const data = await resend.emails.send(payload);

        console.log("Email sent successfully:", data);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({
            error: error.message || "Failed to send email",
        });
    }
});
