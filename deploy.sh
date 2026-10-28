#!/usr/bin/env bash
# Build and deploy to Cloud Run. Idempotent: safe to re-run.
#   ./deploy.sh            build + deploy
#   ./deploy.sh setup      one-time: bucket, service account, secret, then build + deploy
#   ./deploy.sh domain     map $DOMAIN to the service (domain must be verified; add the DNS record it prints)
#
# Settings: PROJECT REGION SERVICE BUCKET DOMAIN GOOGLE_CLIENT_ID ELECTION_AT LOCK_AT PUBLIC_ORIGIN
#           [GA_MEASUREMENT_ID], from the environment or deploy.env.
set -euo pipefail

# All settings come from the environment, or from a local, git-ignored deploy.env
# (copy deploy.env.example). Nothing is hard-coded here.
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$HERE/deploy.env" ]; then set -a; . "$HERE/deploy.env"; set +a; fi

require() {
	local missing=()
	for v in "$@"; do [ -n "${!v:-}" ] || missing+=("$v"); done
	if [ ${#missing[@]} -gt 0 ]; then
		echo "Missing settings: ${missing[*]}" >&2
		echo "Set them in the environment or in deploy.env (see deploy.env.example)." >&2
		exit 1
	fi
}

require PROJECT REGION SERVICE
SA_NAME="${SERVICE}-run"
SA="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
IMAGE="gcr.io/${PROJECT}/${SERVICE}"

gc() { gcloud --project "$PROJECT" "$@"; }

setup() {
	require BUCKET
	gc services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com storage.googleapis.com
	# Bucket: private, uniform access, versioned so nothing is ever lost.
	if ! gc storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1; then
		gc storage buckets create "gs://${BUCKET}" --location="$REGION" --uniform-bucket-level-access --public-access-prevention
	fi
	gc storage buckets update "gs://${BUCKET}" --versioning
	# Dedicated runtime identity with access to this bucket only.
	gc iam service-accounts describe "$SA" >/dev/null 2>&1 || gc iam service-accounts create "$SA_NAME" --display-name "$SERVICE Cloud Run"
	gc storage buckets add-iam-policy-binding "gs://${BUCKET}" --member "serviceAccount:${SA}" --role roles/storage.objectAdmin >/dev/null
	# Session signing secret.
	if ! gc secrets describe "${SERVICE}-session-secret" >/dev/null 2>&1; then
		openssl rand -base64 48 | tr -d '\n' | gc secrets create "${SERVICE}-session-secret" --data-file=- --replication-policy=automatic
	fi
	gc secrets add-iam-policy-binding "${SERVICE}-session-secret" --member "serviceAccount:${SA}" --role roles/secretmanager.secretAccessor >/dev/null
}

deploy() {
	require BUCKET GOOGLE_CLIENT_ID ELECTION_AT LOCK_AT PUBLIC_ORIGIN
	local env_vars="STORAGE_BACKEND=gcs,GCS_BUCKET=${BUCKET},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},ELECTION_AT=${ELECTION_AT},LOCK_AT=${LOCK_AT},PUBLIC_ORIGIN=${PUBLIC_ORIGIN}"
	if [ -n "${GA_MEASUREMENT_ID:-}" ]; then env_vars="${env_vars},GA_MEASUREMENT_ID=${GA_MEASUREMENT_ID}"; fi
	local secrets="SESSION_SECRET=${SERVICE}-session-secret:latest"
	# Optional OAuth client secret (redirect sign-in in in-app browsers): name it in OAUTH_CLIENT_SECRET_NAME.
	if [ -n "${OAUTH_CLIENT_SECRET_NAME:-}" ]; then
		secrets="${secrets},GOOGLE_CLIENT_SECRET=${OAUTH_CLIENT_SECRET_NAME}:latest"
	fi
	gc builds submit --tag "$IMAGE" .
	gc run deploy "$SERVICE" \
		--image "$IMAGE" --region "$REGION" --platform managed \
		--service-account "$SA" --allow-unauthenticated \
		--cpu 1 --memory 512Mi --concurrency 80 --min-instances 0 --max-instances 20 \
		--cpu-boost \
		--set-env-vars "$env_vars" \
		--set-secrets "$secrets"
	gc run services describe "$SERVICE" --region "$REGION" --format 'value(status.url)'
}

domain() {
	require DOMAIN
	gc beta run domain-mappings describe --domain "$DOMAIN" --region "$REGION" >/dev/null 2>&1 \
		|| gc beta run domain-mappings create --service "$SERVICE" --domain "$DOMAIN" --region "$REGION"
	echo "DNS record to add (if not present):"
	gc beta run domain-mappings describe --domain "$DOMAIN" --region "$REGION" --format 'table(status.resourceRecords[].name,status.resourceRecords[].type,status.resourceRecords[].rrdata)'
}

case "${1:-deploy}" in
	setup) setup; deploy ;;
	deploy) deploy ;;
	domain) domain ;;
	*) echo "usage: $0 [setup|deploy|domain]"; exit 1 ;;
esac
