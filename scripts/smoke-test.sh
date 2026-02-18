#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:3001}"

echo "[1/7] create intent"
intent_json="$(curl -sS -X POST "$API_BASE/v1/intents" -H "content-type: application/json" -d '{"title":"Smoke Intent","objective":"Test pipeline","audience":"QA","tone":"neutral"}')"
intent_id="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$intent_json")"
echo "intent_id=$intent_id"

echo "[2/7] create document"
doc_json="$(curl -sS -X POST "$API_BASE/v1/documents" -H "content-type: application/json" -d "{\"title\":\"Smoke Document\",\"intentId\":\"$intent_id\"}")"
doc_id="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["id"])' "$doc_json")"
echo "document_id=$doc_id"

echo "[3/7] start generation"
gen_json="$(curl -sS -X POST "$API_BASE/v1/documents/$doc_id/generate" -H "content-type: application/json" -d '{"mode":"draft","instructions":"Include clear CTA"}')"
job_id="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["job"]["id"])' "$gen_json")"
echo "job_id=$job_id"

echo "[4/7] poll job"
for _ in $(seq 1 20); do
  job_json="$(curl -sS "$API_BASE/v1/jobs/$job_id")"
  job_status="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["status"])' "$job_json")"
  echo "job_status=$job_status"
  if [[ "$job_status" == "succeeded" ]]; then
    break
  fi
  if [[ "$job_status" == "failed" ]]; then
    echo "job failed: $job_json"
    exit 1
  fi
  sleep 1
done

echo "[5/7] get latest version"
versions_json="$(curl -sS "$API_BASE/v1/documents/$doc_id/versions?limit=1")"
version_id="$(python3 -c 'import json,sys; print(json.loads(sys.argv[1])["versions"][0]["id"])' "$versions_json")"
echo "version_id=$version_id"

echo "[6/7] validate version"
validate_json="$(curl -sS -X POST "$API_BASE/v1/versions/$version_id/validate" -H "content-type: application/json")"
echo "$validate_json"

echo "[7/7] publish version (force)"
publish_json="$(curl -sS -X POST "$API_BASE/v1/versions/$version_id/publish" -H "content-type: application/json" -d '{"channel":"web","variantKey":"smoke","force":true}')"
echo "$publish_json"

echo "smoke test passed"

