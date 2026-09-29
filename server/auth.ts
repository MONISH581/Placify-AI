/**
 * Stateless HS256 JWT authentication + Express middlewares.
 *
 * - Tokens are signed with JWT_SECRET (no fallback) and expire after 24h.
 * - The header must declare alg HS256; signatures are compared in constant time.
 * - Every authenticated request re-loads the user from the database, so admin rights
 *   (and deleted accounts) are always taken from the DB, never from the token payload.
 */

import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "./config";
import { prisma } from "./db";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

interface TokenPayload {
  sub: string;
  username: string;
  iat: number;
  exp: number;
}

function base64url(input: string | Buffer): string {
  return (typeof input === "string" ? Buffer.from(input, "utf8") : input).toString("base64url");
}

function sign(data: string): Buffer {
  return crypto.createHmac("sha256", config.jwtSecret).update(data).digest();
}

export function signToken(user: { id: string; username: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload: TokenPayload = { sub: user.id, username: user.username, iat: now, exp: now + config.jwtTtlSeconds };
  const body = base64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  return `${data}.${base64url(sign(data))}`;
}

export function verifyToken(token: string): TokenPayload | null {
  if (typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signaturePart] = parts;
  try {
    const header = JSON.parse(Buffer.from(headerPart, "base64url").toString("utf8"));
    if (!header || header.alg !== "HS256" || (header.typ !== undefined && header.typ !== "JWT")) return null;

    const expected = sign(`${headerPart}.${payloadPart}`);
    const actual = Buffer.from(signaturePart, "base64url");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;

    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (!payload || typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;
    if (payload.exp <= now) return null;
    if (typeof payload.iat === "number" && payload.iat > now + 60) return null;
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== "string") return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

async function loadAuthUser(token: string): Promise<AuthUser | null> {
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, username: true, isAdmin: true },
  });
  return user ?? null;
}

/** Requires a valid bearer token; responds 401 otherwise. */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  loadAuthUser(token)
    .then((user) => {
      if (!user) {
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }
      req.user = user;
      next();
    })
    .catch(next);
}

/** Attaches req.user when a valid bearer token is present; never rejects the request. */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = extractBearer(req);
  if (!token) {
    next();
    return;
  }
  loadAuthUser(token)
    .then((user) => {
      if (user) req.user = user;
      next();
    })
    .catch(next);
}

/** Must run after `authenticate`; the admin flag comes from the database row loaded there. */
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!req.user.isAdmin) {
    res.status(403).json({ error: "Admin privileges required" });
    return;
  }
  next();
}
