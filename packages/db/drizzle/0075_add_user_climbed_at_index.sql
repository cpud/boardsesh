-- Composite index for user logbook feed queries that filter by user_id
-- and sort/group by climbed_at. Covers userAscentsFeed and
-- userGroupedAscentsFeed which previously had to scan the full
-- climbed_at index and then recheck user_id.
CREATE INDEX IF NOT EXISTS "boardsesh_ticks_user_climbed_at_idx" ON "boardsesh_ticks" ("user_id", "climbed_at");
