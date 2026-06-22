---
name: schema-agent
description: Design, review, and apply database schema changes for a roadmap task. Owns migrations, schema integrity, and cheatsheet updates. Use before writing any code that touches the data model.
---

# /schema-agent — Schema Agent

Before starting, read `.claude/context.md` for project-specific rules, constraints, and conventions.

## Permissions

✅ CAN read    : all project files (for context)
✅ CAN write   : schema file · schema cheatsheet document · generated migration files
✅ CAN run     : migration commands · schema generation commands · DB studio
❌ CANNOT      : write to application source, component, test, or roadmap files
❌ CANNOT      : write application code (API routes, components, business logic)
❌ CANNOT      : apply a migration to production without explicit user confirmation
❌ CANNOT      : drop columns or models without a prior data migration

## When to use

Before implementing any task whose **Schema impact** is `Migration`. Also useful to audit an existing migration before it goes to production.

---

## Step-by-step

### 1 — Read the context

1. Read `.current-task` for the active TASK-ID.
2. Read the task block in `docs/ROADMAP.md` — extract the **Impact**, **Acceptance criteria**, and **Code tasks** fields.
3. Read the schema cheatsheet (path defined in `.claude/context.md`) to understand the current data model.
4. Read the schema file to see existing models.
5. If [`docs/ARCHITECTURE.md`](../../../docs/ARCHITECTURE.md) exists, read its data-model section and isolation/trust-boundary notes — keep the migration consistent with the documented model and decisions.

### 2 — Design the changes

For each field or model to add/modify:

| Question | Check |
|---|---|
| Correct type? | Use the type system supported by the project ORM |
| Nullable or required? | Optional if adding to an existing table with data (otherwise blocking migration) |
| Default value? | Required for any new NOT NULL field on an existing table |
| FK relation? | Cascade or restrict based on semantics |
| Soft delete? | Add a `deletedAt` timestamp field if the model does not have it [PROJECT RULE — see .claude/context.md] |
| Index needed? | On any column used frequently in query filters |
| Tenant/scope required? | Any model tied to tenant data must carry the scoping field [PROJECT RULE — see .claude/context.md] |

### 3 — Draft the schema diff

Show the diff before applying anything. Explain every non-obvious choice (type, nullable, index).

### 4 — Check absolute rules

Before writing to the schema file:

- [ ] Soft delete field present on every new business model [PROJECT RULE — see .claude/context.md]
- [ ] Scoping field present on every tenant-scoped model [PROJECT RULE — see .claude/context.md]
- [ ] No column deletion without a data migration
- [ ] No sensitive credential fields exposable via ORM eager-loading relations

### 5 — Apply the migration

Use the migration command defined in `.claude/context.md`. After the migration, regenerate the ORM client and any generated artifacts.

### 6 — Update the cheatsheet

Read the schema cheatsheet document and update:
- The model list if a new model was added
- The key fields for the modified model
- Any JSON/untyped field structures if affected

If the data model changed shape (new model or relation), use `/diagram erd` to refresh the Mermaid ERD in the cheatsheet so the visual stays in sync with the schema.

### 7 — Report

```
✅ Migration : <migration-name>
📐 Models affected : <list>
📋 Cheatsheet : updated
⚠️  Notes : <if applicable>
```

---

## ORM version rules

[PROJECT CONVENTION — see .claude/context.md for the ORM version in use and any version-specific constraints]

After any production migration: rebuild the application image if the ORM client is compiled into the container (see `.claude/context.md`).
