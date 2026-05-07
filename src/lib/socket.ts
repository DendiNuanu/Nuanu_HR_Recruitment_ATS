import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Returns the Socket.IO client instance, or null if we are on a platform that
 * does not support persistent WebSocket connections (e.g. Vercel serverless).
 *
 * A dedicated socket server is required — set NEXT_PUBLIC_SOCKET_URL to its URL.
 * Without that env var the socket is intentionally disabled so there are no
 * repeated 404 requests to /api/socket.
 */
export function getSocket(): Socket | null {
  if (typeof window === "undefined") return null;

  // Require an explicit socket server URL — Vercel serverless has no /api/socket
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (!socketUrl) return null;

  if (!socket) {
    socket = io(socketUrl, {
      path: "/api/socket",
      addTrailingSlash: false,
      // Limit reconnection so a dead server doesn't flood the network
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      timeout: 5000,
    });

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
