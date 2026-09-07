import {
    guestInviteTemplate,
    hostProposalTemplate,
    confirmationTemplate
} from './emailTemplates';

const FROM_EMAIL = 'noreply@notifications.engsight.app'

// Cloud Function endpoint URL - update with your actual project ID after deploying
// Format: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/sendEmail
const CLOUD_FUNCTION_URL = import.meta.env.VITE_CLOUD_FUNCTION_URL || 'https://us-central1-engsightlabs.cloudfunctions.net/sendEmail';

/**
 * Generic email sender (calls Firebase Cloud Function)
 */
export const sendEmail = async (to, subject, htmlContent, cc = null) => {
    try {
        console.log('📧 Sending email via Cloud Function...');
        console.log('To:', to);
        if (cc) console.log('CC:', cc);
        console.log('Subject:', subject);

        const body = {
            to,
            subject,
            html: htmlContent
        };

        if (cc) {
            body.cc = cc;
        }

        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to send email');
        }

        const data = await response.json();
        console.log('✅ Email sent successfully:', data);
        return { success: true, data };

    } catch (error) {
        console.error('❌ Failed to send email:', error);
        // For development, still log what we tried to send
        console.log('Would have sent:', { to, cc, subject });
        return { success: false, error: error.message };
    }
};

/**
 * Scenario A & B Merged: Send email to both host and guest when event is created
 * Uses Scenario B (Guest Invite) template
 * Logic: To: Guest (if avail), CC: Host
 */
export const sendEventCreatedEmail = async (event, shareUrl) => {
    let to = event.hostEmail;
    let cc = null;

    if (event.guestEmail) {
        to = event.guestEmail;
        cc = event.hostEmail;
    }

    const subject = `📅 You're invited to a playdate: ${event.title}`;
    const html = guestInviteTemplate(event, shareUrl);
    return await sendEmail(to, subject, html, cc);
};

/**
 * Scenario C & D Merged: Send email to both host and guest when proposal is sent
 * Uses Scenario C (Host Proposal) template
 * Logic: To: Host, CC: Guest
 */
export const sendProposalNotificationEmail = async (event) => {
    const to = event.hostEmail;
    let cc = null;

    if (event.guestEmail) {
        cc = event.guestEmail;
    }

    const subject = `💡 New time proposal for: ${event.title}`;
    const html = hostProposalTemplate(event);
    return await sendEmail(to, subject, html, cc);
};

/**
 * Scenario E: Send confirmation email to both host and guest
 * Logic: To: [Host, Guest] (Single email)
 */
export const sendConfirmationEmails = async (event) => {
    const subject = `✅ Playdate confirmed: ${event.title}`;
    const html = confirmationTemplate(event);

    const recipients = [event.hostEmail];
    if (event.guestEmail) {
        recipients.push(event.guestEmail);
    }

    return await sendEmail(recipients, subject, html);
};
