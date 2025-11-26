import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getEvent } from "@/lib/db";
import { downloadICS } from "@/lib/ics";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { CheckCircle, Calendar, MapPin, Clock } from "lucide-react";
import { format, addMinutes } from "date-fns";

export default function Confirmation() {
    const [searchParams] = useSearchParams();
    const eventId = searchParams.get("eventId");
    const [event, setEvent] = useState(null);

    useEffect(() => {
        if (eventId) {
            getEvent(eventId).then(setEvent);
        }
    }, [eventId]);

    const handleDownloadIcs = () => {
        if (event) downloadICS(event);
    };

    if (!event || !event.confirmedSlot) {
        return <div className="text-center p-8">Loading confirmation...</div>;
    }

    const startTime = new Date(event.confirmedSlot.start);
    const endTime = addMinutes(startTime, event.duration || 30);

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
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl text-green-700">Playdate Confirmed!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <p className="text-gray-600 flex items-center justify-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {format(startTime, "EEEE, MMMM do, yyyy")}
                        </p>
                        <p className="text-gray-600 flex items-center justify-center gap-2">
                            <Clock className="w-4 h-4" />
                            {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
                        </p>
                        <p className="text-gray-600 flex items-center justify-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {event.location}
                        </p>
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

                    <Button variant="outline" onClick={() => window.location.href = '/'} className="w-full mt-4 bg-gray-50 hover:bg-gray-100">
                        Create Another Event
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
