import { format, addMinutes } from "date-fns";

/**
 * Base email layout with styling consistent with the app
 */
export const getEmailLayout = (content) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TinyTime</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            background: linear-gradient(to bottom right, #EFF6FF, #ffffff, #FAF5FF);
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(to right, #2563EB, #7C3AED);
            color: white;
            padding: 24px;
            text-align: center;
        }
        .logo {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 16px;
            border-radius: 24px;
            font-size: 14px;
            font-weight: 500;
            margin-bottom: 12px;
        }
        .content {
            padding: 32px 24px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
            margin: 0 0 16px 0;
        }
        .subtitle {
            font-size: 16px;
            color: #6B7280;
            margin: 0 0 24px 0;
        }
        .button {
            display: inline-block;
            background: #2563EB;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            margin: 16px 0;
        }
        .button:hover {
            background: #1D4ED8;
            color: #ffffff !important;
        }
        .info-box {
            background: #F3F4F6;
            border-left: 4px solid #2563EB;
            padding: 16px;
            margin: 16px 0;
            border-radius: 4px;
        }
        .info-box p {
            margin: 4px 0;
        }
        .info-label {
            font-weight: 600;
            color: #111827;
        }
        .footer {
            background: #F9FAFB;
            padding: 16px 24px;
            text-align: center;
            font-size: 14px;
            color: #6B7280;
        }
        .divider {
            border-top: 1px solid #E5E7EB;
            margin: 24px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">⏰ TinyTime</div>
            <div style="font-size: 20px; font-weight: 600;">Playdate Scheduling</div>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>This is an automated message from TinyTime</p>
            <p style="margin-top: 8px; font-size: 12px;">Please do not reply to this email</p>
        </div>
    </div>
</body>
</html>
`;
};

/**
 * Template for Scenario A: Host notification when event is created
 */
export const hostEventCreatedTemplate = (event, shareUrl) => {
    const content = `
        <h1 class="title">🎉 Your Event is Ready!</h1>
        <p class="subtitle">You've successfully created a playdate invitation.</p>
        
        <div class="info-box">
            <p><span class="info-label">Event:</span> ${event.title}</p>
            <p><span class="info-label">Location:</span> ${event.location || 'TBD'}</p>
            ${event.description ? `<p><span class="info-label">Description:</span> ${event.description}</p>` : ''}
            <p><span class="info-label">Host:</span> ${event.hostEmail}</p>
            ${event.guestEmail ? `<p><span class="info-label">Guest:</span> ${event.guestEmail}</p>` : ''}
        </div>

        <p>Share this link with your guest so they can pick a time that works:</p>
        
        <div style="text-align: center;">
            <a href="${shareUrl}" class="button">View Event</a>
        </div>

        <div class="divider"></div>

        <p style="font-size: 14px; color: #6B7280;">
            <strong>Link to share:</strong><br>
            <a href="${shareUrl}" style="color: #2563EB; word-break: break-all;">${shareUrl}</a>
        </p>
    `;

    return getEmailLayout(content);
};

/**
 * Template for Scenario B: Guest invitation when event is created
 */
export const guestInviteTemplate = (event, shareUrl) => {
    const content = `
        <h1 class="title">📅 You're Invited!</h1>
        <p class="subtitle">${event.hostEmail} has invited you to a playdate.</p>
        
        <div class="info-box">
            <p><span class="info-label">Event:</span> ${event.title}</p>
            <p><span class="info-label">Location:</span> ${event.location || 'TBD'}</p>
            ${event.description ? `<p><span class="info-label">Description:</span> ${event.description}</p>` : ''}
            <p><span class="info-label">Host:</span> ${event.hostEmail}</p>
        </div>

        <p>Click the button below to view available times and select one that works for you:</p>
        
        <div style="text-align: center;">
            <a href="${shareUrl}" class="button">View Times & Respond</a>
        </div>

        <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
            Can't make any of the proposed times? You can suggest alternative times when you visit the link.
        </p>
    `;

    return getEmailLayout(content);
};

/**
 * Template for Scenario C: Host notification when guest proposes new times
 */
export const hostProposalTemplate = (event) => {
    const eventUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/?eventId=${event.id}`;

    const content = `
        <h1 class="title">💡 New Time Proposal</h1>
        <p class="subtitle">${event.guestEmail} has proposed alternative times for your playdate.</p>
        
        <div class="info-box">
            <p><span class="info-label">Event:</span> ${event.title}</p>
            <p><span class="info-label">Location:</span> ${event.location || 'TBD'}</p>
            <p><span class="info-label">Guest:</span> ${event.guestEmail}</p>
        </div>

        <p>Please review the proposed times and select one that works for you, or create a new invitation with different times.</p>
        
        <div style="text-align: center;">
            <a href="${eventUrl}" class="button">Review Proposed Times</a>
        </div>
    `;

    return getEmailLayout(content);
};

/**
 * Template for Scenario D: Guest confirmation that proposal was sent
 */
export const guestProposalSentTemplate = (event) => {
    const content = `
        <h1 class="title">✅ Proposal Sent!</h1>
        <p class="subtitle">Your time proposal has been sent to ${event.hostEmail}.</p>
        
        <div class="info-box">
            <p><span class="info-label">Event:</span> ${event.title}</p>
            <p><span class="info-label">Location:</span> ${event.location || 'TBD'}</p>
            <p><span class="info-label">Host:</span> ${event.hostEmail}</p>
        </div>

        <p>The host will review your proposed times and confirm a time that works for both of you. You'll receive an email notification once they respond.</p>
        
        <p style="font-size: 14px; color: #6B7280; margin-top: 24px;">
            Thank you for your flexibility in finding a time that works!
        </p>
    `;

    return getEmailLayout(content);
};

/**
 * Template for Scenario E: Confirmation email for both parties
 */
export const confirmationTemplate = (event) => {
    const startTime = new Date(event.confirmedSlot.start);
    const endTime = addMinutes(startTime, event.duration || 30);

    const content = `
        <h1 class="title">✅ Playdate Confirmed!</h1>
        <p class="subtitle">Your playdate has been confirmed.</p>
        
        <div class="info-box" style="background: #ECFDF5; border-left-color: #10B981;">
            <p style="font-size: 18px; font-weight: bold; color: #065F46; margin-bottom: 12px;">${event.title}</p>
            <p><span class="info-label">📅 Date:</span> ${format(startTime, "EEEE, MMMM do, yyyy")}</p>
            <p><span class="info-label">🕐 Time:</span> ${format(startTime, "h:mm a")} - ${format(endTime, "h:mm a")}</p>
            <p><span class="info-label">📍 Location:</span> ${event.location || 'TBD'}</p>
            ${event.description ? `<p><span class="info-label">ℹ️ Details:</span> ${event.description}</p>` : ''}
        </div>

        <div class="info-box">
            <p><span class="info-label">Host:</span> ${event.hostEmail}</p>
            <p><span class="info-label">Guest:</span> ${event.guestEmail}</p>
        </div>

        <p>Add this event to your calendar:</p>
        
        <div style="text-align: center; margin: 24px 0;">
            <a href="${typeof window !== 'undefined' ? window.location.origin : ''}/?eventId=${event.id}" class="button">
                View Confirmation & Add to Calendar
            </a>
        </div>

        <p style="font-size: 14px; color: #6B7280;">
            See you at the playdate! If you need to make any changes, please contact the other party directly.
        </p>
    `;

    return getEmailLayout(content);
};
