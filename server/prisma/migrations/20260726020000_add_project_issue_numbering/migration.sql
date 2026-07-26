-- Phase 5: human-readable, project-scoped issue numbers.
--
-- Each project keeps its own counter, so the first issue of every project is
-- number 1 and the display key ("API-1") is derived from the project key.

-- Counter column. Existing projects start at 1 and are corrected by the
-- backfill below.
ALTER TABLE "projects" ADD COLUMN "nextIssueNumber" INTEGER NOT NULL DEFAULT 1;

-- The column is created with a temporary default so that rows which already
-- exist stay valid while they are being numbered.
ALTER TABLE "issues" ADD COLUMN "number" INTEGER NOT NULL DEFAULT 0;

-- Backfill: number the existing issues per project in a stable order.
WITH numbered AS (
    SELECT
        "id",
        ROW_NUMBER() OVER (
            PARTITION BY "projectId"
            ORDER BY "position", "createdAt", "id"
        ) AS "issueNumber"
    FROM "issues"
)
UPDATE "issues"
SET "number" = numbered."issueNumber"
FROM numbered
WHERE "issues"."id" = numbered."id";

-- Move every project counter past its highest existing issue number.
UPDATE "projects"
SET "nextIssueNumber" = COALESCE(
    (SELECT MAX("number") FROM "issues" WHERE "issues"."projectId" = "projects"."id"),
    0
) + 1;

-- New issues must always receive their number from the project counter.
ALTER TABLE "issues" ALTER COLUMN "number" DROP DEFAULT;

CREATE UNIQUE INDEX "issues_projectId_number_key" ON "issues"("projectId", "number");
