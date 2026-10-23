import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCalendar, fold, googleCalendarUrl, icsDate, icsText } from "../src/lib/ics";

process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-1234";

const event = {
  uid: "lesson-abc@ln-studio",
  start: new Date("2026-10-23T08:30:00Z"),
  end: new Date("2026-10-23T09:30:00Z"),
  title: "LN · Portamento Sposa – lezione 2",
  description: "Ingresso, strascico; velo\nDocente: Docente LN",
  location: "Studio LN, Via Roma 1",
  sequence: 2,
};

test("date in UTC compatte", () => {
  assert.equal(icsDate(event.start), "20261023T083000Z");
});

test("escape di virgole, punti e virgola e a capo", () => {
  assert.equal(icsText("a, b; c\nd\\e"), "a\\, b\\; c\\nd\\\\e");
});

test("righe oltre 75 ottetti spezzate con spazio iniziale, anche con caratteri accentati", () => {
  const long = `DESCRIPTION:${"è".repeat(60)}`;
  const folded = fold(long);
  for (const line of folded.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75, line);
  assert.equal(folded.split("\r\n").slice(1).every((l) => l.startsWith(" ")), true);
  assert.equal(folded.replace(/\r\n /g, ""), long);
});

test("calendario valido con evento, SEQUENCE e promemoria", () => {
  const ics = buildCalendar([event]);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.match(ics, /UID:lesson-abc@ln-studio/);
  assert.match(ics, /DTSTART:20261023T083000Z/);
  assert.match(ics, /SEQUENCE:2/);
  assert.match(ics, /LOCATION:Studio LN\\, Via Roma 1/);
  assert.equal((ics.match(/BEGIN:VALARM/g) ?? []).length, 2);
  assert.ok(!/[^\r]\n/.test(ics), "solo terminatori CRLF");
});

test("link Google Calendar con date e dettagli", () => {
  const url = new URL(googleCalendarUrl(event));
  assert.equal(url.hostname, "calendar.google.com");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("dates"), "20261023T083000Z/20261023T093000Z");
  assert.equal(url.searchParams.get("location"), "Studio LN, Via Roma 1");
});

test("link firmati: validi solo per lo stesso scopo e valore", async () => {
  const { sign, verify } = await import("../src/lib/signing");
  const sig = sign("lesson", "abc");
  assert.ok(verify("lesson", "abc", sig));
  assert.ok(!verify("lesson", "abd", sig));
  assert.ok(!verify("feed", "abc", sig));
  assert.ok(!verify("lesson", "abc", "x"));
  assert.ok(!verify("lesson", "abc", null));
});
