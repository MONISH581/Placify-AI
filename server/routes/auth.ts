import { Router } from "express";
import { z } from "zod";
import { authenticate, signToken, type AuthenticatedRequest } from "../auth";
import { prisma } from "../db";
import { asyncHandler, HttpError, todayUtc, validate } from "../http";
import { burnVerifyTime, hashPassword, verifyPassword } from "../passwords";
import { getPublicUser } from "../users";

const RESERVED_USERNAMES = new Set(["admin", "administrator", "root", "system", "placify", "support", "moderator"]);

const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address")),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[A-Za-z0-9_.-]+$/, "Username may only contain letters, digits, '.', '_' and '-'"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128, "Password is too long"),
});

const LoginSchema = z
  .object({
    email: z.string().trim().max(254).optional(),
    username: z.string().trim().max(254).optional(),
    password: z.string().min(1, "Password is required").max(128),
  })
  .refine((v) => Boolean(v.email || v.username), { message: "Email or username is required", path: ["email"] });

export const authRouter = Router();

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, username, password } = validate(RegisterSchema, req.body, "Invalid registration details");
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      throw new HttpError(409, "This username is not available");
    }
    const clash = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User" WHERE lower(email) = lower(${email}) OR lower(username) = lower(${username}) LIMIT 1`;
    if (clash.length > 0) {
      throw new HttpError(409, "Email or username is already registered");
    }

    const created = await prisma.user.create({
      data: {
        email,
        username,
        password: await hashPassword(password),
        isAdmin: false,
        xp: 0,
        level: 1,
        streak: 1,
        lastActiveDate: todayUtc(),
        accuracy: 0,
        verified: false,
      },
    });
    const user = await getPublicUser(created.id);
    res.status(201).json({ success: true, user, token: signToken(created) });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, username, password } = validate(LoginSchema, req.body, "Invalid login payload");
    const identifier = (email || username || "").trim();
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "User" WHERE lower(email) = lower(${identifier}) OR lower(username) = lower(${identifier}) LIMIT 1`;
    const account = rows.length ? await prisma.user.findUnique({ where: { id: rows[0].id } }) : null;

    if (!account) {
      await burnVerifyTime(password);
      throw new HttpError(401, "Invalid email/username or password");
    }
    const check = await verifyPassword(password, account.password);
    if (!check.valid) {
      throw new HttpError(401, "Invalid email/username or password");
    }
    if (check.needsRehash) {
      await prisma.user.update({ where: { id: account.id }, data: { password: await hashPassword(password) } });
    }
    const user = await getPublicUser(account.id);
    res.json({ success: true, user, token: signToken(account) });
  })
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    res.json({ success: true, user: await getPublicUser(req.user!.id) });
  })
);

// Tokens are stateless; the client discards its copy.
authRouter.post("/logout", (_req, res) => {
  res.json({ success: true });
});
