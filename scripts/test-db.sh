#!/usr/bin/env bash
set -euo pipefail
# The explicitly supplied URL must point to a disposable, empty PostgreSQL database.
: "${GEVYRO_TEST_DATABASE_URL:?Set GEVYRO_TEST_DATABASE_URL to an isolated empty test database. Never use a production database.}"
psql "$GEVYRO_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/bootstrap.sql
psql "$GEVYRO_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/202611200001_financial_workspace.sql
psql "$GEVYRO_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls.integration.sql
