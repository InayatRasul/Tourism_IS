# 09 — Copy-Paste Prompt for Next Agent / Context

Copy and paste the block below when starting a new chat session to continue developing Tourism IS:

```text
You are continuing development of the Tourism IS project (Go + React/TypeScript/Tailwind + PostgreSQL + Docker Compose).

1. First, read @[Attachments/00_START_HERE.md], @[Attachments/08_PROGRESS_LOG.md], and @[Attachments/02_ROADMAP_PHASES.md] to understand the architecture, what is already completed, and what phase is next.
2. Check @[Attachments/Tourism_IS_Project_Description.md] and @[Attachments/03_DATABASE_SCHEMA.md] for the exact business rules and SQL constraints.
3. Implement the next unchecked phase in @[Attachments/02_ROADMAP_PHASES.md] (or the specific phase I ask for), wire the existing React UI components in `frontend/src/` to the new Go API endpoints, verify with `go test ./...` and `docker compose up -d --build`, and update @[Attachments/02_ROADMAP_PHASES.md] and @[Attachments/08_PROGRESS_LOG.md] before finishing.
```
