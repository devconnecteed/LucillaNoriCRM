import { createHmac, timingSafeEqual } from "node:crypto";

// Firme HMAC per i link pubblici dei calendari (.ics): si aprono senza login dall'email o
// da Apple/Google Calendar, ma non sono indovinabili. Ruotare SESSION_SECRET li invalida tutti.

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET mancante o troppo corto");
  return s;
}

export function sign(purpose: string, value: string) {
  return createHmac("sha256", secret()).update(`${purpose}:${value}`).digest("base64url").slice(0, 32);
}

export function verify(purpose: string, value: string, signature: string | null | undefined) {
  if (!signature) return false;
  const expected = Buffer.from(sign(purpose, value));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
