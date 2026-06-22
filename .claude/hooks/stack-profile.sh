#!/usr/bin/env bash
# stack-profile.sh — single source of truth for all stack-specific patterns the hooks use.
# Pipeline orchestration is stack-agnostic; only the regex/glob/command values below are
# stack-bound. Retarget the pipeline by editing THIS file, never the hook scripts.
#
# PROFILE: Vue 3 · Vite · TypeScript · PrimeVue · Pinia · Supabase · n8n · Vitest · Playwright

# Test/spec files — excluded from content scanners; flagged by guard-test-files.
export STACK_TEST_FILE_REGEX='\.(test|spec)\.(ts|tsx|js)$'

# Implementation paths gated behind /start-task (guard-roadmap-gate, guard-branch).
export STACK_GATED_PATHS_REGEX='^(src/|tests/|supabase/migrations/)'

# Auto-generated files that must never be hand-edited (guard-generated-files).
export STACK_GENERATED_FILES_GLOB='*/src/types/database.ts'

# Hard-delete that bypasses Kafka/audit (guard-soft-delete) — direct Supabase delete.
export STACK_SOFT_DELETE_PATTERN='\.from\([^)]*\)\.delete\('

# Destructive DB command that wipes data (guard-destructive-db).
export STACK_DESTRUCTIVE_DB_PATTERN='supabase db reset|supabase migration repair'

# Audit-log mutation (guard-audit-log) — Xayma audit table is general_audit (rule 11).
export STACK_AUDIT_LOG_ORM_PATTERN='\.from\(["'\'']xayma_app\.general_audit["'\''][^)]*\)\.(update|delete|upsert)\('
export STACK_AUDIT_LOG_SQL_PATTERN='(UPDATE|DELETE)[[:space:]]+.*general_audit'

# Sensitive field names that must never appear in client code / responses (guard-expose-hash).
export STACK_SENSITIVE_FIELDS='service_role|SUPABASE_SERVICE_ROLE|VITE_PAYMENT_GATEWAY[A-Z_]*SECRET|passwordHash'

# Sources that feed generated types, and the command to regenerate (remind-docs-generate).
export STACK_DOCS_SOURCE_REGEX='^(supabase/migrations/|src/services/)'
export STACK_DOCS_GENERATE_CMD='npm run supabase:types'

# New migration files (remind-docker-rebuild — inert for the Vite SPA but kept for parity).
export STACK_MIGRATIONS_REGEX='^supabase/migrations/'
export STACK_DOCKER_REBUILD_CMD='npm run supabase:types'

# Xayma-specific: direct credit mutation bypassing Kafka/workflow-engine (rule 6).
# Used by guard-credit-write.sh (Task 6).
export STACK_CREDIT_WRITE_PATTERN='remainingCredits[[:space:]]*[:=]|\.from\(["'\'']xayma_app\.partners["'\''][^)]*\)\.(update|upsert)\('
