-- PR-34 — multi-user readiness: unique constraints on server-assigned
-- sequence columns. Before this, two concurrent writers could file the
-- same TOR version / amendment number / DT6 note version; the indexes
-- make the race lose loudly (23505) instead of corrupting the sequence.
--
-- Remediation first: any pre-existing duplicates (possible while clients
-- computed max+1 from a stale cache) are renumbered deterministically —
-- dense ROW_NUMBER per partition ordered by (sequence, id). For healthy
-- gap-free data this is a no-op; collided rows get distinct numbers in
-- insertion order so the index creation below cannot abort the deploy.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY procurement_package_id ORDER BY version, id
  ) AS rn
  FROM tor_documents
)
UPDATE tor_documents t SET version = ranked.rn
FROM ranked WHERE t.id = ranked.id AND t.version <> ranked.rn;
--> statement-breakpoint
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY contract_id ORDER BY amendment_number, id
  ) AS rn
  FROM contract_amendments
)
UPDATE contract_amendments t SET amendment_number = ranked.rn
FROM ranked WHERE t.id = ranked.id AND t.amendment_number <> ranked.rn;
--> statement-breakpoint
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY project_id, area ORDER BY version, id
  ) AS rn
  FROM knowledge_area_notes
)
UPDATE knowledge_area_notes t SET version = ranked.rn
FROM ranked WHERE t.id = ranked.id AND t.version <> ranked.rn;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "tor_documents_package_version_uq" ON "tor_documents" ("procurement_package_id","version");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contract_amendments_contract_number_uq" ON "contract_amendments" ("contract_id","amendment_number");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_area_notes_project_area_version_uq" ON "knowledge_area_notes" ("project_id","area","version");
