// socket.io-client default export is the `io` function (lookup)
// Named `io` export has resolution issues with moduleResolution:bundler
import io from "socket.io-client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let socket: any = null;

/**
 * Returns the Socket.IO client instance, or null if we are on a platform that
 * does not support persistent WebSocket connections (e.g. Vercel serverless).
 *
 * A dedicated socket server is required — set NEXT_PUBLIC_SOCKET_URL to its URL.
 * Without that env var the socket is intentionally disabled so there are no
 * repeated 404 requests to /api/socket.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSocket(): any {
  if (typeof window === "undefined") return null;

  // Require an explicit socket server URL — Vercel serverless has no /api/socket
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!socketUrl) return null;

  if (!socket) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const opts: any = {
      path: "/api/socket",
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      timeout: 5000,
    };
    socket = io(socketUrl, opts);

    socket.on("connect", () => {
      console.log("Connected to Real-time Notification Engine");
    });

    socket.on("connect_error", () => {
      // Silently give up after the reconnection budget is exhausted
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Real-time Notification Engine");
    });
  }

  return socket;
}

export function emitEvent(event: string, data: unknown) {
  const s = getSocket();
  if (s) s.emit(event, data);
}
