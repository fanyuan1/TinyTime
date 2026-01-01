import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "./ui/Input";

// Global state to track Google Maps API loading across component instances
let googleMapsLoadingPromise = null;

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
    // Track if a place was just selected to prevent onChange from being called with stale value
    const placeSelectedRef = useRef(false);

    // Stable onChange reference to avoid re-initializing autocomplete
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Load Google Maps API
    useEffect(() => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

        if (!apiKey) {
            console.warn("Google Maps API key not found. Location input will work as plain text.");
            setApiError(true);
            return;
        }

        // Check if Google Maps is already fully loaded
        if (window.google && window.google.maps && window.google.maps.places) {
            setApiLoaded(true);
            return;
        }

        // If already loading, wait for the existing promise
        if (googleMapsLoadingPromise) {
            googleMapsLoadingPromise
                .then(() => setApiLoaded(true))
                .catch(() => setApiError(true));
            return;
        }

        // Check if script tag already exists in DOM (e.g., from a previous mount)
        const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
        if (existingScript) {
            // Script exists, wait for it to load
            googleMapsLoadingPromise = new Promise((resolve, reject) => {
                const checkLoaded = () => {
                    if (window.google && window.google.maps && window.google.maps.places) {
                        resolve();
                    } else {
                        setTimeout(checkLoaded, 100);
                    }
                };
                existingScript.addEventListener('load', checkLoaded);
                existingScript.addEventListener('error', reject);
                // Also check immediately in case it's already loaded
                checkLoaded();
            });
            googleMapsLoadingPromise
                .then(() => setApiLoaded(true))
                .catch(() => setApiError(true));
            return;
        }

        // Load the Google Maps script for the first time
        googleMapsLoadingPromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            
            script.onload = () => {
                resolve();
            };

            script.onerror = () => {
                console.error("Failed to load Google Maps API");
                reject(new Error("Failed to load Google Maps API"));
            };

            document.head.appendChild(script);
        });

        googleMapsLoadingPromise
            .then(() => setApiLoaded(true))
            .catch(() => setApiError(true));

        // Don't cleanup/remove the script on unmount - it should persist
    }, []);

    // Initialize Google Places Autocomplete
    useEffect(() => {
        if (!apiLoaded || apiError || !inputRef.current) {
            return;
        }

        // Don't re-initialize if already initialized
        if (autocompleteRef.current) {
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
                
                let newValue = "";
                if (place.name && place.formatted_address) {
                    // Combine place name with formatted address
                    // e.g., "Holbrook Park, 225 Park Ln, Atherton, CA 94027, USA"
                    newValue = `${place.name}, ${place.formatted_address}`;
                } else if (place.formatted_address) {
                    // Use formatted address if no name available
                    newValue = place.formatted_address;
                } else if (place.name) {
                    // Fallback to place name only
                    newValue = place.name;
                } else {
                    // If no structured data, get the value directly from the input
                    // This handles the case when user types and presses Enter without selecting
                    newValue = inputRef.current?.value || "";
                }

                if (newValue) {
                    // Mark that a place was selected
                    placeSelectedRef.current = true;
                    setLocalValue(newValue);
                    onChangeRef.current(newValue);
                    
                    // Reset the flag after a short delay
                    setTimeout(() => {
                        placeSelectedRef.current = false;
                    }, 100);
                }
            });
        } catch (error) {
            console.error("Error initializing Google Places Autocomplete:", error);
            setApiError(true);
        }
    }, [apiLoaded, apiError]); // Removed onChange from dependencies

    // Sync external value changes
    useEffect(() => {
        setLocalValue(value || "");
    }, [value]);

    const handleChange = (e) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        
        // Only propagate changes if a place wasn't just selected
        // This prevents overwriting the selected place with the typed text
        if (!placeSelectedRef.current) {
            // If Google API is not available, propagate immediately
            if (apiError || !apiLoaded) {
                onChange(newValue);
            }
            // When API is loaded, we'll propagate on blur or place selection
        }
    };

    const handleBlur = useCallback(() => {
        // On blur, sync the final value to parent if API is loaded
        // This ensures typed values (without selection) are still saved
        if (apiLoaded && !apiError && !placeSelectedRef.current) {
            onChange(localValue);
        }
    }, [apiLoaded, apiError, localValue, onChange]);

    return (
        <div className="relative">
            <Input
                ref={inputRef}
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
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
