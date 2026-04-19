import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import { Server } from "socket.io";
import { authMiddleware } from "./auth-middleware.js";
import { registerSocketHandlers } from "./socket-handlers.js";
import type { ServerToClientEvents, ClientToServerEvents } from "@chat-app/shared";

const PORT = parseInt(process.env.PORT || "8080", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const REDIS_URL = process.env.REDIS_URL;

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const httpServer = createServer(app);

async function start() {
  const ioOptions: Record<string, unknown> = {
    cors: {
      origin: CORS_ORIGIN,
      methods: ["GET", "POST"],
    },
  };

  // Only use Redis adapter if REDIS_URL is provided
  if (REDIS_URL) {
    const { Redis } = await import("ioredis");
    const { createAdapter } = await import("@socket.io/redis-adapter");
    const { subscribeToRedisEvents } = await import("./redis.js");

    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();

    ioOptions.adapter = createAdapter(pubClient, subClient);

    const io = new Server<ClientToServerEvents, ServerToClientEvents>(
      httpServer,
      ioOptions
    );

    io.use(authMiddleware);

    io.on("connection", (socket) => {
      console.log(`User connected: ${socket.data.userId}`);
      registerSocketHandlers(io, socket, pubClient);
    });

    subscribeToRedisEvents(io, subClient.duplicate());
    console.log("Redis adapter enabled");
  } else {
    const io = new Server<ClientToServerEvents, ServerToClientEvents>(
      httpServer,
      ioOptions
    );

    io.use(authMiddleware);

    io.on("connection", (socket) => {
      console.log(`User connected: ${socket.data.userId}`);
      registerSocketHandlers(io, socket, null);
    });

    console.log("Running without Redis (no pub/sub)");
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`WebSocket server running on 0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
