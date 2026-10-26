import { test } from "node:test";
import assert from "node:assert/strict";
import { clearFailures, rateLimited, recordFailure } from "../src/lib/rate-limit";

test("blocco dopo il numero massimo di tentativi falliti, sblocco a fine finestra", () => {
  const key = "login:test@ln.local";
  const t0 = 1_000_000;
  for (let i = 0; i < 5; i++) {
    assert.equal(rateLimited(key, 5, t0).limited, false);
    recordFailure(key, 60_000, t0);
  }
  assert.equal(rateLimited(key, 5, t0 + 1).limited, true);
  assert.ok(rateLimited(key, 5, t0 + 1).retryInMs > 0);
  assert.equal(rateLimited(key, 5, t0 + 60_001).limited, false);
});

test("un accesso riuscito azzera i tentativi", () => {
  const key = "login:altra@ln.local";
  for (let i = 0; i < 5; i++) recordFailure(key, 60_000);
  assert.equal(rateLimited(key, 5).limited, true);
  clearFailures(key);
  assert.equal(rateLimited(key, 5).limited, false);
});
