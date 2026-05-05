import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket() {
  if (!socket && typeof window !== "undefined") {
    // For standard Next.js, this would point to the same host
    // In production, this might be a dedicated socket server
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin, {
      path: "/api/socket",
      addTrailingSlash: false,
    });

    socket.on("connect", () => {
      console.log("Connected to Real-time Notification Engine");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from Real-time Notification Engine");
    });
  }
  return socket;
}

export function emitEvent(event: string, data: any) {
  if (socket) {
    socket.emit(event, data);
  }
}
