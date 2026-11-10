# 00 — Start Here (Tourism IS Handoff Index)

Welcome to **Tourism IS — Plan Trips and Plan Excursions**. This folder (`Attachments/`) contains the complete project specification, architectural decisions, database design, roadmap checklists, and progress log so any developer or AI coding agent can pick up the project immediately without losing context.

---

## 1. Reading Order for New Sessions

1. **[`Tourism_IS_Project_Description.md`](./Tourism_IS_Project_Description.md)** — The authoritative functional & non-functional requirements (**WHAT** the system does: FR-01..41, BR-01..11, NFR-01..08, UC-01..25).
2. **[`08_PROGRESS_LOG.md`](./08_PROGRESS_LOG.md)** — **Current project status**, what is already built and verified, and what phase is next.
3. **[`01_ARCHITECTURE_AND_DECISIONS.md`](./01_ARCHITECTURE_AND_DECISIONS.md)** — Technical stack, directory layout, environment variables, and Architecture Decision Records (ADRs).
4. **[`02_ROADMAP_PHASES.md`](./02_ROADMAP_PHASES.md)** — Phased implementation plan with checkboxes (`[x]` done, `[ ]` pending).
5. **[`03_DATABASE_SCHEMA.md`](./03_DATABASE_SCHEMA.md)** — Full 12-table PostgreSQL schema, `CHECK` constraints, indexes, and transactional SQL patterns.
6. **[`09_AGENT_HANDOFF_PROMPT.md`](./09_AGENT_HANDOFF_PROMPT.md)** — Ready-to-copy prompt for starting a new AI session.

---

## 2. How to Run & Verify Right Now

```bash
# Start PostgreSQL 17, Go API, and React UI (Nginx)
docker compose up -d --build

# Check health
curl http://localhost:8080/api/v1/health
```

- **Web UI:** `http://localhost:3000`
- **REST API:** `http://localhost:8080/api/v1`
- **Database:** `localhost:5432` (`POSTGRES_DB=tis`, `POSTGRES_USER=tis`, `POSTGRES_PASSWORD=tis`)

### Seeded Accounts (`APP_ENV=dev`)
- **Admin:** `admin` / `admin`
- **Tourist:** `tourist@tis.kz` / `Passw0rd!`
- **Guide:** `guide@tis.kz` / `Passw0rd!`
- **Agency Manager:** `manager@tis.kz` / `Passw0rd!`

---

## 3. Working Rules for Continuing Development

1. **Do not break existing migrations or seed accounts** (`admin` / `admin` must always work in `dev`).
2. **Replace frontend mock actions incrementally:** Every UI screen is already built in `frontend/src/pages/`. As you implement each backend phase (P3..P10) in `backend/internal/`, swap the corresponding method in `frontend/src/mocks/MockStoreContext.tsx` with a real `apiFetch(...)` call.
3. **Update docs before ending a session:** Tick completed items in [`02_ROADMAP_PHASES.md`](./02_ROADMAP_PHASES.md) and append a session summary to [`08_PROGRESS_LOG.md`](./08_PROGRESS_LOG.md).
