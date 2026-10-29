#!/bin/sh
# Avvio in produzione: applica le migrazioni, carica il catalogo se il database è vuoto, poi avvia Next.
set -e
: "${SESSION_SECRET:?Imposta SESSION_SECRET (almeno 32 caratteri casuali)}"
: "${APP_URL:?Imposta APP_URL (indirizzo pubblico https)}"
npx prisma migrate deploy
npx prisma db seed
exec npx next start -H 0.0.0.0 -p "${PORT:-3000}"
