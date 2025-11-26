import { db } from "./firebase";
import {
    collection,
    addDoc,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    Timestamp
} from "firebase/firestore";
import {
    sendEventCreatedEmail,
    sendProposalNotificationEmail,
    sendConfirmationEmails
} from "./email";

export const createEvent = async (eventData) => {
    try {
        // Remove settings, move duration to top level if not already there
        const { settings, ...rest } = eventData;
        const duration = eventData.duration || settings?.interval || 30;

        const docRef = await addDoc(collection(db, "events"), {
            ...rest,
            duration,
            createdAt: Timestamp.now(),
            status: "pending",
            guestEmail: eventData.guestEmail || null, // Ensure guestEmail is set
            confirmedSlot: null
        });

        const eventId = docRef.id;
        const event = { id: eventId, ...rest, duration, guestEmail: eventData.guestEmail || null };
        const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}?eventId=${eventId}`;

        // Scenario A & B: Send email to both host and guest
        await sendEventCreatedEmail(event, shareUrl);

        return eventId;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
    }
};

export const getEvent = async (eventId) => {
    try {
        console.log("Attempting to fetch event:", eventId);
        const docRef = doc(db, "events", eventId);
        console.log("Document reference created for:", docRef.path);
        const docSnap = await getDoc(docRef);
        console.log("Document snapshot received, exists:", docSnap.exists());

        if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() };
            console.log("Event data:", data);
            return data;
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (e) {
        console.error("Error getting document: ", e);
        throw e;
    }
};

export const updateEventStatus = async (eventId, status, confirmedSlot = null, guestEmail = null) => {
    try {
        const eventRef = doc(db, "events", eventId);
        const updateData = {
            status: status,
            confirmedSlot: confirmedSlot,
        };
        // Update guestEmail if provided (e.g. during confirmation)
        if (guestEmail) {
            updateData.guestEmail = guestEmail;
        }
        await updateDoc(eventRef, updateData);

        // Scenario E: Send confirmation emails to both parties when confirmed
        if (status === 'confirmed') {
            const eventDoc = await getDoc(eventRef);
            const event = { id: eventId, ...eventDoc.data() };
            await sendConfirmationEmails(event);
        }
    } catch (e) {
        console.error("Error updating status: ", e);
        throw e;
    }
};

export const addProposal = async (eventId, proposedSlots, proposerEmail, duration) => {
    try {
        const eventRef = doc(db, "events", eventId);
        const updateData = {
            proposedSlots: proposedSlots, // Now contains { start }
            status: "negotiating",
            updatedAt: new Date().toISOString()
        };

        if (duration) {
            updateData.duration = duration;
        }

        // If we are adding a proposal, it implies negotiation.
        // In our single-round flow, only the Guest proposes (Host creates -> Guest proposes).
        // So we can assume proposerEmail is the guestEmail.
        updateData.guestEmail = proposerEmail;

        await updateDoc(eventRef, updateData);

        // Get the updated event data for emails
        const eventDoc = await getDoc(eventRef);
        const event = { id: eventId, ...eventDoc.data() };

        // Scenario C & D: Send email to both host and guest
        await sendProposalNotificationEmail(event);
    } catch (e) {
        console.error("Error adding proposal: ", e);
        throw e;
    }
};

export const updateEventDetails = async (eventId, updates) => {
    try {
        const eventRef = doc(db, "events", eventId);

        // Only include fields that are defined
        const updateData = {
            updatedAt: new Date().toISOString()
        };

        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.location !== undefined) updateData.location = updates.location;
        if (updates.hostEmail !== undefined) updateData.hostEmail = updates.hostEmail;
        if (updates.guestEmail !== undefined) updateData.guestEmail = updates.guestEmail;
        if (updates.duration !== undefined) updateData.duration = updates.duration;

        await updateDoc(eventRef, updateData);
    } catch (e) {
        console.error("Error updating event details: ", e);
        throw e;
    }
};
