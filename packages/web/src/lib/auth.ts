import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("JWT_SECRET is required in production"); })() : "dev-secret-change-me");
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("JWT_REFRESH_SECRET is required in production"); })() : "dev-secret-change-me");

const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days
const SOCKET_TOKEN_TTL = 60; // 60 seconds

interface AccessTokenPayload {
  sub: string;
  nickname: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(userId: string, nickname: string): string {
  return jwt.sign({ sub: userId, nickname }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

export function signSocketToken(userId: string, nickname: string): string {
  return jwt.sign({ sub: userId, nickname, type: "socket" }, JWT_SECRET, {
    expiresIn: SOCKET_TOKEN_TTL,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

export async function rotateRefreshToken(
  oldToken: string
): Promise<{ accessToken: string; refreshToken: string; userId: string } | null> {
  const record = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { user: true },
  });

  if (!record || record.expiresAt < new Date()) {
    if (record) {
      await prisma.refreshToken.delete({ where: { id: record.id } });
    }
    return null;
  }

  // Delete old token (rotation)
  await prisma.refreshToken.delete({ where: { id: record.id } });

  const accessToken = signAccessToken(record.user.id, record.user.nickname);
  const refreshToken = await generateRefreshToken(record.user.id);

  return { accessToken, refreshToken, userId: record.user.id };
}

export function setAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  accessToken: string,
  refreshToken: string
): void {
  cookieStore.set("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: ACCESS_TOKEN_TTL,
    path: "/",
  });

  cookieStore.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_TTL,
    path: "/",
  });
}

export function clearAuthCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>
): void {
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
}

export async function getCurrentUser(): Promise<AccessTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) return null;

  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}
