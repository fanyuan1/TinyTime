import { format, addMinutes } from "date-fns";

export const generateICS = (event) => {
    const { title, description, location, confirmedSlot, hostEmail, guestEmail, duration } = event;

    if (!confirmedSlot) return "";

    const startDate = new Date(confirmedSlot.start);
    const endDate = addMinutes(startDate, duration || 30);

    const formatDate = (date) => {
        return date.toISOString().replace(/-|:|\.\d+/g, "");
    };

    const icsContent = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Playdate Scheduler//EN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        `UID:${event.id}@playdatescheduler.com`,
        `DTSTAMP:${formatDate(new Date())}`,
        `DTSTART:${formatDate(startDate)}`,
        `DTEND:${formatDate(endDate)}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description || ""}`,
        `LOCATION:${location || ""}`,
        `ORGANIZER;CN=Host:mailto:${hostEmail}`,
        guestEmail ? `ATTENDEE;CN=Guest;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=TRUE:mailto:${guestEmail}` : "",
        "STATUS:CONFIRMED",
        "SEQUENCE:0",
        "END:VEVENT",
        "END:VCALENDAR"
    ].filter(line => line !== "").join("\r\n");

    return icsContent;
};

export const downloadICS = (event) => {
    const content = generateICS(event);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${event.title.replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
