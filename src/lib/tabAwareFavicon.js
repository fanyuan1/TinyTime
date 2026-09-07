/**
 * Swaps the favicon to an alarm-clock emoji (⏰) whenever more than one
 * TinyTime tab is open in the same browser, and restores the default icon
 * when only one remains.
 *
 * Tab presence is tracked over a BroadcastChannel: each tab announces
 * itself, heartbeats every few seconds, and says goodbye on unload. Peers
 * that go silent are pruned so a hard-crashed tab doesn't linger.
 */

const CHANNEL_NAME = "tinytime-tabs";
const HEARTBEAT_MS = 2000;
const STALE_MS = 6000;

/**
 * Render ⏰ to a PNG data URL via canvas. A rasterised emoji is far more
 * reliable as a favicon than an inline <svg><text>⏰</text></svg> data URI,
 * which several browsers refuse to paint in the tab strip.
 */
const makeClockIcon = () => {
    try {
        const size = 64;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.font =
            '54px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("⏰", size / 2, size / 2 + 2);
        return canvas.toDataURL("image/png");
    } catch {
        return null;
    }
};

export const initTabAwareFavicon = () => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const original = document.querySelector("link[rel~='icon']");
    const defaultIcon = {
        href: (original && original.getAttribute("href")) || "/favicon.ico",
        type: (original && original.getAttribute("type")) || "image/x-icon",
    };
    const clockHref = makeClockIcon();
    if (!clockHref) return;

    let current = null;
    const setIcon = (href, type) => {
        if (current === href) return;
        current = href;
        document
            .querySelectorAll("link[rel~='icon']")
            .forEach((link) => link.remove());
        const link = document.createElement("link");
        link.rel = "icon";
        if (type) link.type = type;
        link.href = href;
        document.head.appendChild(link);
    };

    const tabId =
        (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
        String(Math.random());
    const peers = new Map(); // peerId -> last-seen timestamp
    const channel = new BroadcastChannel(CHANNEL_NAME);

    const render = () => {
        const now = Date.now();
        for (const [id, seen] of peers) {
            if (now - seen > STALE_MS) peers.delete(id);
        }
        if (peers.size > 0) setIcon(clockHref, "image/png");
        else setIcon(defaultIcon.href, defaultIcon.type);
    };

    const post = (type) => channel.postMessage({ type, id: tabId });

    channel.onmessage = ({ data }) => {
        if (!data || data.id === tabId) return;
        if (data.type === "bye") {
            peers.delete(data.id);
        } else {
            peers.set(data.id, Date.now());
            // A newcomer says "hello"; existing tabs reply so it learns about us.
            if (data.type === "hello") post("here");
        }
        render();
    };

    post("hello");
    render();

    const heartbeat = setInterval(() => {
        post("ping");
        render();
    }, HEARTBEAT_MS);

    window.addEventListener("pagehide", () => {
        clearInterval(heartbeat);
        post("bye");
    });
};
