import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { authMiddleware } from "./auth-middleware.js";
import { registerSocketHandlers } from "./socket-handlers.js";
import { subscribeToRedisEvents } from "./redis.js";
import type { ServerToClientEvents, ClientToServerEvents } from "@chat-app/shared";

const PORT = parseInt(process.env.PORT || "8080", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const app = express();
app.use(cors({ origin: CORS_ORIGIN }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const httpServer = createServer(app);

const pubClient = new Redis(REDIS_URL);
const subClient = pubClient.duplicate();

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
  },
  adapter: createAdapter(pubClient, subClient),
});

io.use(authMiddleware);

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.data.userId}`);
  registerSocketHandlers(io, socket, pubClient);
});

subscribeToRedisEvents(io, subClient.duplicate());

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});
