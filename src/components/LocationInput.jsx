import { useEffect, useRef, useState } from "react";
import { Input } from "./ui/Input";

// Module-level singleton so the Google Maps loader / Places library is only
// requested once, no matter how many LocationInput instances mount.
let placesLibraryPromise = null;

const loadPlacesLibrary = (apiKey) => {
    if (placesLibraryPromise) return placesLibraryPromise;

    placesLibraryPromise = new Promise((resolve, reject) => {
        // Loader already present (e.g. added by a previous mount).
        if (window.google?.maps?.importLibrary) {
            resolve(window.google.maps.importLibrary("places"));
            return;
        }

        const existing = document.querySelector("script[data-google-maps-loader]");
        if (existing) {
            existing.addEventListener("load", () =>
                resolve(window.google.maps.importLibrary("places"))
            );
            existing.addEventListener("error", () =>
                reject(new Error("Failed to load Google Maps API"))
            );
            return;
        }

        const callbackName = "__initGoogleMapsPlaces";
        window[callbackName] = () => {
            delete window[callbackName];
            resolve(window.google.maps.importLibrary("places"));
        };

        const script = document.createElement("script");
        script.src =
            `https://maps.googleapis.com/maps/api/js?key=${apiKey}` +
            `&loading=async&libraries=places&callback=${callbackName}`;
        script.async = true;
        script.dataset.googleMapsLoader = "true";
        script.onerror = () => reject(new Error("Failed to load Google Maps API"));
        document.head.appendChild(script);
    });

    return placesLibraryPromise;
};

/**
 * LocationInput — Google Places autocomplete built on the modern
 * google.maps.places.PlaceAutocompleteElement web component.
 *
 * Requires the "Places API (New)" to be enabled for the API key's project.
 * Gracefully falls back to a plain text input when the key is missing or the
 * Places library can't be loaded.
 *
 * Props match a normal controlled input: `value` (string) / `onChange(string)`.
 */
export const LocationInput = ({
    value,
    onChange,
    placeholder,
    id,
    name,
    required,
    ...props
}) => {
    const containerRef = useRef(null);
    const elementRef = useRef(null);
    const onChangeRef = useRef(onChange);
    // "loading" -> waiting on the Places library
    // "ready"   -> PlaceAutocompleteElement mounted
    // "fallback"-> plain <Input> (no key / API unavailable)
    const [status, setStatus] = useState("loading");
    // True once the user has selected a place via this widget, so the
    // "current value" hint (used when editing an existing event) can hide.
    const [picked, setPicked] = useState(false);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            console.warn(
                "Google Maps API key not found. Location input will work as plain text."
            );
            setStatus("fallback");
            return;
        }

        let cancelled = false;

        const commitPlace = async (place) => {
            if (!place) return;
            try {
                await place.fetchFields({
                    fields: ["displayName", "formattedAddress"],
                });
                const displayName = place.displayName;
                const address = place.formattedAddress;
                let next = "";
                if (displayName && address) next = `${displayName}, ${address}`;
                else next = address || displayName || "";
                if (next) {
                    setPicked(true);
                    onChangeRef.current(next);
                }
            } catch (err) {
                console.error("Error resolving selected place:", err);
            }
        };

        loadPlacesLibrary(apiKey)
            .then((places) => {
                if (cancelled) return;
                const { PlaceAutocompleteElement } = places;
                if (!PlaceAutocompleteElement) {
                    throw new Error(
                        "PlaceAutocompleteElement unavailable — enable 'Places API (New)'"
                    );
                }

                const el = new PlaceAutocompleteElement();
                if (id) el.id = id;
                if (placeholder) el.placeholder = placeholder;

                // Current API: fires with { placePrediction }.
                el.addEventListener("gmp-select", ({ placePrediction }) => {
                    commitPlace(placePrediction?.toPlace?.());
                });
                // Older loader versions fire this instead, with { place }.
                el.addEventListener("gmp-placeselect", ({ place }) => {
                    commitPlace(place);
                });

                elementRef.current = el;
                containerRef.current?.appendChild(el);
                setStatus("ready");
            })
            .catch((err) => {
                console.error(
                    "Google Places unavailable, falling back to text input:",
                    err
                );
                if (!cancelled) setStatus("fallback");
            });

        return () => {
            cancelled = true;
            elementRef.current?.remove();
            elementRef.current = null;
        };
    }, [id, placeholder]);

    if (status === "fallback") {
        return (
            <Input
                id={id}
                name={name}
                required={required}
                placeholder={placeholder || "Enter a location"}
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                {...props}
            />
        );
    }

    return (
        <div className="space-y-1">
            <div ref={containerRef} className="gmp-autocomplete" />
            {status === "loading" && (
                <p className="text-xs text-muted-foreground">Loading location search…</p>
            )}
            {status === "ready" && value && !picked && (
                <p className="text-xs text-muted-foreground">
                    Current: {value} — search above to change it.
                </p>
            )}
        </div>
    );
};
