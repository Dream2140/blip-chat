import jwt from "jsonwebtoken";
import type { Socket } from "socket.io";

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("JWT_SECRET is required in production"); })() : "dev-secret-change-me");

interface SocketTokenPayload {
  sub: string;
  nickname: string;
  type: "socket";
}

export function authMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): void {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as SocketTokenPayload;

    if (payload.type !== "socket") {
      return next(new Error("Invalid token type"));
    }

    socket.data.userId = payload.sub;
    socket.data.nickname = payload.nickname;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
}
