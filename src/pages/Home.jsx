import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useEvent } from "@/context/EventContext";
import { createEvent, getEvent, updateEventStatus, addProposal, updateEventDetails } from "@/lib/db";
import { EventForm } from "@/components/EventForm";
import { TimeSlotPicker } from "@/components/TimeSlotPicker";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Loader2, Share2, Check, Calendar, Link as LinkIcon, MapPin, Clock, Pencil, ChevronRight, Mail, AlignLeft } from "lucide-react";
import { format, addMinutes } from "date-fns";
import Confirmation from "./Confirmation";

export default function Home() {
    console.log("Home rendering...");
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const eventId = searchParams.get("eventId");
    const urlMode = searchParams.get("mode"); // Move to top level
    const context = useEvent();
    console.log("EventContext value:", context);
    const { state, dispatch } = context;
    const [loading, setLoading] = useState(!!eventId);
    const [shareUrl, setShareUrl] = useState("");
    const [copied, setCopied] = useState(false);
    const [proposalSlots, setProposalSlots] = useState([]); // Moved to top level for React Hooks rules

    useEffect(() => {
        if (eventId) {
            setLoading(true);
            const loadEvent = async () => {
                try {
                    const event = await getEvent(eventId);
                    if (event) {
                        if (urlMode === "edit") {
                            // Load event in edit mode
                            dispatch({ type: "LOAD_EVENT", payload: { eventData: event, selectedSlots: event.proposedSlots || [], mode: "edit_event" } });
                        } else if (event.status === 'confirmed') {
                            // Check if event is confirmed - if so, render confirmation view
                            dispatch({ type: "LOAD_EVENT", payload: { eventData: event, selectedSlots: event.proposedSlots || [], mode: "confirmed_view" } });
                        } else {
                            // Normal flow for pending/negotiating events
                            dispatch({ type: "LOAD_EVENT", payload: { eventData: event, selectedSlots: event.proposedSlots || [], mode: "view" } });
                        }
                    } else {
                        // Handle not found - set mode to create and show error
                        console.error("Event not found:", eventId);
                        dispatch({ type: "SET_MODE", payload: "create" });
                        alert("Event not found!");
                    }
                } catch (error) {
                    console.error("Failed to load event", error);
                    // On error, go back to create mode
                    dispatch({ type: "SET_MODE", payload: "create" });
                    alert("Failed to load event. Please try again.");
                } finally {
                    setLoading(false);
                }
            };
            loadEvent();
        } else {
            // No eventId, ensure we're in create mode and not loading
            dispatch({ type: "SET_MODE", payload: "create" });
            setLoading(false);
        }
    }, [eventId, urlMode, dispatch]);

    const handleCreateEvent = async (formData) => {
        dispatch({ type: "UPDATE_EVENT_DATA", payload: formData });
        dispatch({ type: "SET_MODE", payload: "pick_time" });
    };

    const handlePublish = async () => {
        setLoading(true);
        try {
            // Ensure duration is set, default to 30 if missing
            const duration = state.eventData.duration || 30;

            const eventPayload = {
                ...state.eventData,
                proposedSlots: state.selectedSlots,
                duration: duration,
                // settings removed
            };

            console.log("Publishing event:", eventPayload); // Debug log

            const newEventId = await createEvent(eventPayload);
            const url = `${window.location.origin}/?eventId=${newEventId}`;
            setShareUrl(url);
            dispatch({ type: "SET_MODE", payload: "share" });
        } catch (error) {
            console.error("Failed to create event", error);
            alert("Failed to create event. Please try again."); // Simple user feedback
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = () => {
        // Create shareable message with event title
        const shareMessage = `You're invited to ${state.eventData?.title || 'a playdate'}! View details & RSVP: ${shareUrl}`;
        
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // --- CONFIRMED EVENT VIEW ---
    // Render the Confirmation component directly when the event is confirmed
    if (state.mode === "confirmed_view") {
        return <Confirmation eventData={state.eventData} />;
    }

    // --- HOST FLOW: STEP 2 (SELECT TIMES) ---
    if (state.mode === "pick_time") {
        return (
            <div className="w-full max-w-3xl mx-auto p-4 space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Select Available Times</h2>
                    <p className="text-gray-500">Choose all times that work for you</p>
                </div>

                <TimeSlotPicker
                    selectedSlots={state.selectedSlots}
                    initialDuration={state.eventData.duration}
                    onChange={(slots, duration) => {
                        dispatch({ type: "SET_SLOTS", payload: slots });
                        if (duration) {
                            dispatch({ type: "UPDATE_EVENT_DATA", payload: { duration } });
                        }
                    }}
                    busySlots={[]} // Removed sync logic

                />

                <div className="flex flex-col gap-3">
                    {/* Sync Calendar Button Removed */}


                    <Button
                        onClick={handlePublish}
                        disabled={state.selectedSlots.length === 0}
                        className="w-full"
                    >
                        Create &amp; Share Event
                    </Button>
                    <Button variant="ghost" onClick={() => dispatch({ type: "SET_MODE", payload: "create" })}>
                        Back
                    </Button>
                </div>
            </div>
        );
    }

    // --- HOST FLOW: STEP 3 (SHARE) ---
    if (state.mode === "share") {
        return (
            <Card className="w-full max-w-3xl mx-auto text-center">
                <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Share2 className="w-6 h-6 text-green-600" />
                    </div>
                    <CardTitle>Event Created!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-600">Share this link with the other parent to pick a time.</p>

                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-md p-2 text-sm text-gray-600 truncate">
                            {shareUrl}
                        </div>
                        <Button size="icon" variant="outline" onClick={handleCopyLink}>
                            {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                        </Button>
                    </div>

                    <Button className="w-full" onClick={() => navigate(shareUrl.replace(window.location.origin, ''))}>
                        View Event
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // --- GUEST FLOW (VIEW) ---
    if (state.mode === "view") {
        // Safety check: ensure eventData exists
        if (!state.eventData || !state.eventData.title) {
            return (
                <div className="text-center p-8">
                    <p>Loading event data...</p>
                </div>
            );
        }

        const isNegotiating = state.eventData.status === "negotiating";
        // Always show the event's proposedSlots (which were set from state.selectedSlots on load)
        const slotsToShow = state.selectedSlots || [];

        return (
            <div className="w-full max-w-3xl mx-auto p-4 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                {state.isEditingEvent ? (
                                    <Input
                                        value={state.eventData.title}
                                        onChange={(e) => dispatch({ type: "UPDATE_EVENT_DATA", payload: { title: e.target.value } })}
                                        className="font-semibold text-xl mb-2"
                                    />
                                ) : (
                                    <CardTitle>{state.eventData.title}</CardTitle>
                                )}
                            </div>
                            {!state.isEditingEvent && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        // Navigate to edit mode instead of inline editing
                                        dispatch({ type: "SET_MODE", payload: "edit_event" });
                                    }}
                                >
                                    <Pencil className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Mail className="w-4 h-4 text-blue-600" /> Host: {state.eventData.hostEmail}
                        </div>
                        {state.eventData.guestEmail ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Mail className="w-4 h-4 text-blue-600" /> Guest: {state.eventData.guestEmail}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Mail className="w-4 h-4 text-blue-600" /> Guest: TBD
                            </div>
                        )}
                        {state.eventData.location ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <MapPin className="w-4 h-4 text-blue-600" /> {state.eventData.location}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <MapPin className="w-4 h-4 text-blue-600" /> Location: TBD
                            </div>
                        )}
                        {state.eventData.description ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <AlignLeft className="w-4 h-4 text-blue-600" /> Description: {state.eventData.description}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500"></p>
                        )}
                    </CardContent>
                </Card>

                {isNegotiating && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                        <p className="text-sm text-blue-700">
                            New proposal! <span className="font-bold">{state.eventData.guestEmail}</span> suggested these times.
                        </p>
                    </div>
                )}

                <div className="flex flex-col">
                    <h3 className="font-semibold text-gray-900 mb-4">
                        {isNegotiating ? "Select a Time" : "Select a Time"}
                    </h3>

                    {/* Scrollable time slots container */}
                    <div className="max-h-96 overflow-y-auto grid grid-cols-1 gap-2 pr-2">
                        {slotsToShow.map((slot, i) => (
                            <Button
                                key={i}
                                variant="outline"
                                className="justify-between h-auto py-3 hover:bg-blue-50 hover:border-blue-200 border-l-4 border-l-blue-600"
                                onClick={() => {
                                    dispatch({ type: "SET_SLOTS", payload: [slot] });
                                    // Determine who should enter their email
                                    // If negotiating, it's the Host confirming.
                                    // If not negotiating (pending), it's the Guest confirming.
                                    dispatch({ type: "UPDATE_EVENT_DATA", payload: { guestEmail: state.eventData.guestEmail || "" } });
                                    dispatch({ type: "SET_MODE", payload: "confirm_booking" });
                                }}
                            >
                                <div className="text-left">
                                    <div className="font-medium text-gray-900">
                                        {format(new Date(slot.start), "EEEE, MMMM do")}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {format(new Date(slot.start), "h:mm a")} - {format(addMinutes(new Date(slot.start), state.eventData.duration || 30), "h:mm a")}
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                            </Button>
                        ))}
                    </div>

                    {/* Reject / Create New Invite Button for Host during Negotiation */}
                    {isNegotiating && (
                        <div className="pt-4 space-y-2">
                            <p className="text-sm text-muted-foreground text-center">
                                None of the times work?
                            </p>
                            <Button
                                variant="outline"
                                className="w-full bg-gray-50 hover:bg-gray-100"
                                onClick={() => {
                                    // Redirect to create new event (effectively rejecting)
                                    // We could update status to 'closed' here if we want to track it
                                    if (confirm("This will start a new invite. Proceed?")) {
                                        navigate("/");
                                    }
                                }}
                            >
                                Create a New Invite
                            </Button>
                        </div>
                    )}

                    {/* Propose New Times (only if NOT negotiating - single round) */}
                    {!isNegotiating && (
                        <div className="pt-4 space-y-2">
                            <p className="text-sm text-muted-foreground text-center">
                                None of the times work?
                            </p>
                            <Button
                                variant="outline"
                                className="w-full bg-gray-50 hover:bg-gray-100"
                                onClick={() => {
                                    // Clear slots for proposal but don't lose them in state if we need to go back
                                    // We'll handle empty slots in the propose_time mode
                                    dispatch({ type: "SET_MODE", payload: "propose_time" });
                                }}
                            >
                                Propose New Times
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- GUEST FLOW (CONFIRM BOOKING) ---
    if (state.mode === "confirm_booking") {
        const slot = state.selectedSlots[0];
        const isNegotiating = state.eventData.status === "negotiating";
        const hostEmail = state.eventData.hostEmail;
        // attendeeEmail removed


        // Simplified confirmation logic
        // We just need the user to confirm their email.
        // If it's the guest confirming, we use guestEmail.
        // If it's the host confirming (negotiation), we use hostEmail.

        const confirmingEmail = isNegotiating ? hostEmail : (state.eventData.guestEmail || "");


        return (
            <Card className="w-full max-w-3xl mx-auto">
                <CardHeader>
                    <CardTitle>Confirm Booking</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <p className="font-medium text-blue-900">
                            {format(new Date(slot.start), "EEEE, MMMM do")}
                        </p>
                        <p className="text-blue-700">
                            {format(new Date(slot.start), "h:mm a")} - {format(addMinutes(new Date(slot.start), state.eventData.duration || 30), "h:mm a")}

                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Your Email</label>
                        <Input
                            placeholder="your@example.com"
                            type="email"
                            required
                            pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
                            title="Please enter a valid email address"
                            value={confirmingEmail || ""}
                            onChange={(e) => {
                                // Update the appropriate email field
                                if (isNegotiating) {
                                    dispatch({ type: "UPDATE_EVENT_DATA", payload: { hostEmail: e.target.value } });
                                } else {
                                    dispatch({ type: "UPDATE_EVENT_DATA", payload: { guestEmail: e.target.value } });
                                }
                            }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            We'll send a confirmation email to this address.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 pt-2">
                        <Button
                            className="w-full"
                            disabled={!confirmingEmail}
                            onClick={async () => {
                                // Validate: Check if same person who proposed is trying to confirm
                                // Simplified: If negotiating, Host confirms. If not, Guest confirms.
                                // We trust the user entered the correct email for now.



                                setLoading(true);
                                try {
                                    await updateEventStatus(state.eventData.id, "confirmed", slot, confirmingEmail);

                                    // Force page reload to fetch updated event data with confirmed status
                                    window.location.href = `/?eventId=${state.eventData.id}`;
                                } catch (e) {
                                    console.error(e);
                                    alert(`Error: ${e.message}`);
                                    setLoading(false);
                                }
                            }}
                        >
                            Confirm Booking
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full"
                            onClick={() => {
                                // Restore original proposed slots when going back
                                dispatch({ type: "SET_SLOTS", payload: state.originalProposedSlots });
                                dispatch({ type: "SET_MODE", payload: "view" });
                            }}
                        >
                            Back
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // --- GUEST FLOW (PROPOSE TIME) ---
    if (state.mode === "propose_time") {
        // Guest is proposing.
        const proposerEmail = state.eventData.guestEmail || "";

        return (
            <div className="w-full max-w-3xl mx-auto p-4 space-y-6">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">Select Available Times</h2>
                    <p className="text-gray-500">Choose all times that work for you</p>
                </div>

                <TimeSlotPicker
                    selectedSlots={proposalSlots}
                    initialDuration={state.eventData.duration}
                    onChange={(slots, duration) => {
                        setProposalSlots(slots);
                        if (duration) {
                            dispatch({ type: "UPDATE_EVENT_DATA", payload: { duration } });
                        }
                    }}
                    busySlots={[]}
                />

                <div className="flex flex-col gap-3">
                    {/* Email Input - Always editable, pre-filled smartly */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Your Email</label>
                        <Input
                            placeholder="your@example.com"
                            type="email"
                            required
                            pattern="[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$"
                            title="Please enter a valid email address"
                            value={proposerEmail}
                            onChange={(e) => {
                                dispatch({ type: "UPDATE_EVENT_DATA", payload: { guestEmail: e.target.value } });
                            }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            We'll send a confirmation email to this address.
                        </p>
                    </div>

                    <Button
                        onClick={async () => {
                            if (!proposerEmail) {
                                alert("Please enter your email.");
                                return;
                            }
                            setLoading(true);
                            try {
                                await addProposal(
                                    state.eventData.id,
                                    proposalSlots,
                                    proposerEmail,
                                    state.eventData.duration // Pass duration
                                );
                                dispatch({ type: "SET_MODE", payload: "proposal_sent" });
                            } catch (e) {
                                console.error(e);
                                alert("Failed to send proposal.");
                            } finally {
                                setLoading(false);
                            }
                        }}
                        disabled={proposalSlots.length === 0 || !proposerEmail}
                        className="w-full"
                    >
                        Send Proposal
                    </Button>
                    <Button variant="ghost" onClick={() => dispatch({ type: "SET_MODE", payload: "view" })} className="w-full">
                        Back
                    </Button>
                </div>
            </div >
        );
    }

    if (state.mode === "proposal_sent") {
        const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?eventId=${state.eventData.id}` : "";

        return (
            <Card className="w-full max-w-3xl mx-auto text-center">
                <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                        <Share2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <CardTitle>Proposal Sent!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-600">The host has been notified of your proposed times.</p>

                    {/* Shareable link */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Share this event</label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-md p-2 text-sm text-gray-600 truncate text-left">
                                {shareUrl}
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    // Create shareable message with event title
                                    const shareMessage = `New time(s) proposed for ${state.eventData?.title || 'your playdate'}! View details & confirm: ${shareUrl}`;
                                    
                                    // Use robust copy logic
                                    const copyToClipboard = (text) => {
                                        if (navigator.clipboard && navigator.clipboard.writeText) {
                                            navigator.clipboard.writeText(text)
                                                .then(() => {
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                })
                                                .catch(() => fallbackCopy(text));
                                        } else {
                                            fallbackCopy(text);
                                        }
                                    };

                                    const fallbackCopy = (text) => {
                                        const textArea = document.createElement('textarea');
                                        textArea.value = text;
                                        textArea.style.position = 'fixed';
                                        document.body.appendChild(textArea);
                                        textArea.focus();
                                        textArea.select();
                                        try {
                                            document.execCommand('copy');
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        } catch (err) {
                                            console.error('Fallback: Oops, unable to copy', err);
                                            alert("Failed to copy link manually.");
                                        }
                                        document.body.removeChild(textArea);
                                    };

                                    copyToClipboard(shareMessage);
                                }}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <LinkIcon className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>

                    <Button className="w-full" onClick={() => window.location.reload()}>
                        Back to Event
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // --- WAITING FOR RESPONSE (Not You? clicked) ---
    if (state.mode === "waiting_response") {
        // Simplified: If negotiating, waiting for Host. If pending, waiting for Guest.
        // But actually this screen might not be reachable or needed in the new flow as much.
        // Keeping it simple.
        const waitingFor = state.eventData.status === "negotiating" ? "host" : "guest";

        return (
            <Card className="w-full max-w-3xl mx-auto text-center">
                <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                        <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <CardTitle>Waiting for Response</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-600">
                        The {waitingFor} has not responded yet. You'll be notified when they confirm or propose new times.
                    </p>
                    <Button
                        className="w-full"
                        onClick={() => {
                            // Restore original proposed slots when going back
                            dispatch({ type: "SET_SLOTS", payload: state.originalProposedSlots });
                            dispatch({ type: "SET_MODE", payload: "view" });
                        }}
                    >
                        Back to Event
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // --- HOST FLOW: STEP 1 (CREATE EVENT FORM) ---
    if (state.mode === "create" || state.mode === "edit_event") {
        const isEditing = state.mode === "edit_event";

        return (
            <div className="w-full max-w-2xl mx-auto space-y-8">
                {!isEditing && (
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
                            ⏰ TinyTime
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                            Schedule playdates{" "}
                            <span className="text-primary">effortlessly</span>
                        </h1>
                        {/* <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                            No more endless texts. Share your availability and let parents pick a time that works.
                        </p> */}
                    </div>
                )}
                {isEditing && (
                    <div className="text-center">
                        <h2 className="text-3xl font-bold">Edit Event Details</h2>
                        <p className="text-muted-foreground mt-2">Update your event information</p>
                    </div>
                )}
                <Card className="border-2">
                    <CardContent className="pt-8 pb-6">
                        <EventForm
                            onSubmit={async (data) => {
                                if (isEditing) {
                                    // Update existing event in database
                                    setLoading(true);
                                    try {
                                        await updateEventDetails(state.eventData.id, data);
                                        // Update local state
                                        dispatch({ type: "UPDATE_EVENT_DATA", payload: data });
                                        
                                        // Return to appropriate view based on event status
                                        if (state.eventData.status === 'confirmed') {
                                            // Navigate to clean URL without mode parameter
                                            navigate(`/?eventId=${state.eventData.id}`);
                                        } else {
                                            dispatch({ type: "SET_MODE", payload: "view" });
                                        }
                                    } catch (e) {
                                        console.error(e);
                                        alert("Failed to update event.");
                                    } finally {
                                        setLoading(false);
                                    }
                                } else {
                                    // Create new event
                                    handleCreateEvent(data);
                                }
                            }}
                            initialData={state.eventData || {}}
                            isEditing={isEditing}
                        />
                        {isEditing && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    // Return to appropriate view based on event status
                                    if (state.eventData.status === 'confirmed') {
                                        // Navigate to clean URL without mode parameter
                                        navigate(`/?eventId=${state.eventData.id}`);
                                    } else {
                                        dispatch({ type: "SET_MODE", payload: "view" });
                                    }
                                }}
                                className="w-full mt-4"
                            >
                                Back
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
