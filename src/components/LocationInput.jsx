import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/Input";

/**
 * LocationInput component with Google Places Autocomplete
 * Gracefully falls back to regular text input if Google Maps API is not available
 */
export const LocationInput = ({ value, onChange, placeholder, ...props }) => {
    const inputRef = useRef(null);
    const autocompleteRef = useRef(null);
    const [localValue, setLocalValue] = useState(value || "");
    const [apiLoaded, setApiLoaded] = useState(false);
    const [apiError, setApiError] = useState(false);

    // Load Google Maps API
    useEffect(() => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.warn("Google Maps API key not found. Location input will work as plain text.");
            setApiError(true);
            return;
        }

        // Check if Google Maps is already loaded
        if (window.google && window.google.maps && window.google.maps.places) {
            setApiLoaded(true);
            return;
        }

        // Load the Google Maps script
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        
        script.onload = () => {
            setApiLoaded(true);
        };

        script.onerror = () => {
            console.error("Failed to load Google Maps API");
            setApiError(true);
        };

        document.head.appendChild(script);

        return () => {
            // Cleanup if needed
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
        };
    }, []);

    // Initialize Google Places Autocomplete
    useEffect(() => {
        if (!apiLoaded || apiError || !inputRef.current) {
            return;
        }

        try {
            // Initialize the autocomplete
            autocompleteRef.current = new window.google.maps.places.Autocomplete(
                inputRef.current,
                {
                    types: ["establishment", "geocode"], // Support both places and addresses
                    fields: ["formatted_address", "name", "geometry"], // Request specific fields
                }
            );

            // Listen for place selection
            autocompleteRef.current.addListener("place_changed", () => {
                const place = autocompleteRef.current.getPlace();

                if (place.formatted_address) {
                    // Use formatted address if available
                    const newValue = place.formatted_address;
                    setLocalValue(newValue);
                    onChange(newValue);
                } else if (place.name) {
                    // Fallback to place name
                    const newValue = place.name;
                    setLocalValue(newValue);
                    onChange(newValue);
                }
            });
        } catch (error) {
            console.error("Error initializing Google Places Autocomplete:", error);
            setApiError(true);
        }
    }, [apiLoaded, apiError, onChange]);

    // Sync external value changes
    useEffect(() => {
        setLocalValue(value || "");
    }, [value]);

    const handleChange = (e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange(newValue);
    };

    return (
        <div className="relative">
            <Input
                ref={inputRef}
                value={localValue}
                onChange={handleChange}
                placeholder={placeholder || "Enter a location"}
                {...props}
            />
            {!apiError && !apiLoaded && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Loading...
                </div>
            )}
        </div>
    );
};
