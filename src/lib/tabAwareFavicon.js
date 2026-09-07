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

const CLOCK_ICON =
    "data:image/svg+xml," +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
        '<text x="50" y="52" font-size="88" text-anchor="middle" dominant-baseline="central">⏰</text>' +
        "</svg>"
    );

const getIconLink = () => {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }
    return link;
};

export const initTabAwareFavicon = () => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    const iconLink = getIconLink();
    const defaultIcon = iconLink.getAttribute("href") || "/favicon.ico";
    const tabId =
        (crypto && crypto.randomUUID && crypto.randomUUID()) ||
        String(Math.random());
    const peers = new Map(); // peerId -> last-seen timestamp
    const channel = new BroadcastChannel(CHANNEL_NAME);

    const render = () => {
        const now = Date.now();
        for (const [id, seen] of peers) {
            if (now - seen > STALE_MS) peers.delete(id);
        }
        const multiple = peers.size > 0;
        const next = multiple ? CLOCK_ICON : defaultIcon;
        if (iconLink.getAttribute("href") !== next) {
            iconLink.setAttribute("href", next);
        }
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
