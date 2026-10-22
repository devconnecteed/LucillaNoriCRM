import { SignJWT, jwtVerify } from "jose";

// Firma/verifica del cookie di sessione. Usato sia dal middleware (edge) sia dal server.
export const SESSION_COOKIE = "ln_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = { userId: string; role: string };

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET mancante o troppo corto (min 32 caratteri)");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.userId !== "string" || typeof payload.role !== "string") return null;
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
