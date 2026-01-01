import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getEvent } from "@/lib/db";
import { downloadICS } from "@/lib/ics";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CheckCircle, Calendar, MapPin, Clock, Pencil, Share2, Check, FileText, CalendarPlus } from "lucide-react";
import { format, addMinutes } from "date-fns";

export default function Confirmation({ eventData }) {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const eventId = searchParams.get("eventId");
    const [event, setEvent] = useState(eventData || null);
    const [copied, setCopied] = useState(false);

    const handleShare = () => {
        const eventLink = `${window.location.origin}/?eventId=${eventId}`;
        // Create shareable message with event title
        const shareMessage = `${event?.title || 'Your playdate'} has been confirmed! View details & add to your calendar: ${eventLink}`;
        
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shareMessage)
                .then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                })
                .catch(() => {
                    // Fallback
                    fallbackCopyText(shareMessage);
                });
        } else {
            // Fallback
            fallbackCopyText(shareMessage);
        }
    };

    const fallbackCopyText = (text) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
        document.body.removeChild(textArea);
    };

    useEffect(() => {
        if (eventData) {
            setEvent(eventData);
        } else if (eventId) {
            getEvent(eventId).then(setEvent);
        }
    }, [eventId, eventData]);

    const handleDownloadIcs = () => {
        if (event) downloadICS(event);
    };

    const handleEdit = () => {
        // Navigate to edit mode with the event ID
        navigate(`/?eventId=${eventId}&mode=edit`);
    };

    if (!event || !event.confirmedSlot) {
        return <div className="text-center p-8">Loading confirmation...</div>;
    }

    let startTime, endTime;
    try {
        startTime = new Date(event.confirmedSlot.start);
        if (isNaN(startTime.getTime())) {
            console.error("Invalid start time:", event.confirmedSlot.start);
            startTime = new Date(); // Fallback
        }
        endTime = addMinutes(startTime, event.duration || 30);
    } catch (e) {
        console.error("Error parsing dates:", e);
        startTime = new Date();
        endTime = addMinutes(startTime, 30);
    }

    // Format dates for calendar URLs
    const startISO = startTime.toISOString().replace(/-|:|\.\d+/g, "");
    const endISO = endTime.toISOString().replace(/-|:|\.\d+/g, "");

    // Build attendees list for calendar URLs
    const attendees = [event.hostEmail, event.guestEmail].filter(Boolean).join(',');

    // Google Calendar URL with both attendees
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startISO}/${endISO}&details=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}&add=${encodeURIComponent(attendees)}`;

    // Outlook Calendar URL with both attendees
    const outlookCalendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(event.description || '')}&location=${encodeURIComponent(event.location || '')}&startdt=${startTime.toISOString()}&enddt=${endTime.toISOString()}&to=${encodeURIComponent(attendees)}`;

    // iCal/Apple Calendar - Uses the ICS download
    const handleICalDownload = () => {
        if (event) {
            downloadICS(event);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center">
            <Card className="w-full max-w-3xl mx-auto text-center">
                <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <CardTitle className="text-green-700">Playdate Confirmed!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Event Details Card */}
                    <div className="relative bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="absolute top-2 right-2 flex gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleShare}
                                className="text-gray-500 hover:text-gray-700"
                                title="Share event"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleEdit}
                                className="text-gray-500 hover:text-gray-700"
                                title="Edit event details"
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="space-y-2 text-left">
                            <h3 className="font-semibold">{event.title}</h3>
                            <p className="text-gray-600 text-sm flex items-center gap-2">
                                <Calendar className="w-4 h-4 shrink-0" />
                                {format(startTime, "EEEE, MMMM do, yyyy")}
                            </p>
                            <p className="text-gray-600 text-sm flex items-center gap-2">
                                <Clock className="w-4 h-4 shrink-0" />
                                {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                            </p>
                            <p className="text-gray-600 text-sm flex items-center gap-2">
                                <MapPin className="w-4 h-4 shrink-0" />
                                {event.location}
                            </p>
                            {event.description && (
                                <p className="text-gray-600 text-sm flex items-start gap-2">
                                    <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                                    {event.description}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <p className="text-sm text-gray-500 mb-1">Add to your calendar:</p>
                        <Button variant="outline" asChild className="w-full">
                            <a href={googleCalendarUrl} target="_blank" rel="noopener noreferrer">
                                <Calendar className="w-4 h-4 mr-2" />
                                Google Calendar
                            </a>
                        </Button>
                        <Button variant="outline" onClick={handleICalDownload} className="w-full">
                            <Calendar className="w-4 h-4 mr-2" />
                            iCal
                        </Button>
                        <Button variant="outline" asChild className="w-full">
                            <a href={outlookCalendarUrl} target="_blank" rel="noopener noreferrer">
                                <Calendar className="w-4 h-4 mr-2" />
                                Outlook
                            </a>
                        </Button>
                        <Button variant="outline" onClick={handleDownloadIcs} className="w-full">
                            <Calendar className="w-4 h-4 mr-2" />
                            Download ICS
                        </Button>
                    </div>

                    <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full bg-gray-50 hover:bg-gray-100">
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        Create another Event
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
