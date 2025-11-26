"use client";

import { createContext, useContext, useReducer } from "react";

const EventContext = createContext();

const initialState = {
    mode: "create", // create, view, book
    eventData: {
        title: "",
        description: "",
        location: "",
        hostEmail: "",
        duration: 60, // minutes
    },
    selectedSlots: [], // Array of { start }
    originalProposedSlots: [], // Store original proposed slots for back navigation
    isEditingEvent: false, // Track if user is editing event details
};

const eventReducer = (state, action) => {
    switch (action.type) {
        case "SET_MODE":
            return { ...state, mode: action.payload };
        case "UPDATE_EVENT_DATA":
            return { ...state, eventData: { ...state.eventData, ...action.payload } };
        case "SET_SLOTS":
            return { ...state, selectedSlots: action.payload };
        case "ADD_SLOT":
            return { ...state, selectedSlots: [...state.selectedSlots, action.payload] };
        case "REMOVE_SLOT":
            return {
                ...state,
                selectedSlots: state.selectedSlots.filter(
                    s => s.start !== action.payload.start
                )
            };
        case "LOAD_EVENT":
            // Save original proposed slots when loading an event
            const loadedData = action.payload;
            return {
                ...state,
                ...loadedData,
                originalProposedSlots: loadedData.selectedSlots || []
            };
        case "SET_EDITING_EVENT":
            return { ...state, isEditingEvent: action.payload };
        default:
            return state;
    }
};

export const EventProvider = ({ children }) => {
    const [state, dispatch] = useReducer(eventReducer, initialState);

    return (
        <EventContext.Provider value={{ state, dispatch }}>
            {children}
        </EventContext.Provider>
    );
};

export const useEvent = () => {
    const context = useContext(EventContext);
    if (!context) {
        throw new Error("useEvent must be used within an EventProvider");
    }
    return context;
};
