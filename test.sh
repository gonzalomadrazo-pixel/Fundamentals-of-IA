#!/usr/bin/env bash
# Smoke test: verifies the static assets exist and the live API behaves the way
# app.js expects. No build step — this is a zero-dependency static site.
set -u

API="https://class2-signups-fall26.vercel.app/api/signups"
fail=0

check() { # description  expected  actual
  if [ "$2" = "$3" ]; then
    echo "  ok   $1"
  else
    echo "  FAIL $1 (expected $2, got $3)"
    fail=1
  fi
}

echo "Static assets:"
for f in index.html styles.css app.js; do
  if [ -f "$f" ]; then echo "  ok   $f present"; else echo "  FAIL $f missing"; fail=1; fi
done

echo "Frontend contains no secrets / auth:"
if grep -RniE 'api[_-]?key|authorization|bearer|supabase|class[_-]?code|password|secret' \
     index.html styles.css app.js >/dev/null; then
  echo "  FAIL found a forbidden token"; fail=1
else
  echo "  ok   clean"
fi

echo "Live API:"
get_status=$(curl -s -o /dev/null -w '%{http_code}' "$API")
check "GET /api/signups -> 200" "200" "$get_status"

get_body=$(curl -s "$API")
echo "$get_body" | grep -q '"signups"' \
  && echo "  ok   GET body has \"signups\" array" \
  || { echo "  FAIL GET body shape"; fail=1; }

dup_status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API" \
  -H 'Content-Type: application/json' -d '{"name":"Pepe"}')
check "POST existing name -> 409" "409" "$dup_status"

empty_status=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API" \
  -H 'Content-Type: application/json' -d '{"name":""}')
check "POST empty name -> 400" "400" "$empty_status"

echo
[ "$fail" -eq 0 ] && echo "All checks passed." || echo "Some checks failed."
exit "$fail"
