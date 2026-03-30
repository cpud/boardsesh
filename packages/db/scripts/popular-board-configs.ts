import { createScriptDb } from './db-connection';
import { sql } from 'drizzle-orm';

async function main() {
  const { db, close } = createScriptDb();

  try {
    const rows = await db.execute(sql`
      SELECT
        psls.board_type,
        psls.layout_id,
        bl.name AS layout_name,
        psls.product_size_id AS size_id,
        bps.name AS size_name,
        bps.description AS size_description,
        array_agg(DISTINCT psls.set_id ORDER BY psls.set_id) AS set_ids,
        array_agg(DISTINCT bs.name ORDER BY bs.name) AS set_names,
        COALESCE(cc.climb_count, 0) AS climb_count
      FROM board_product_sizes_layouts_sets psls
      JOIN board_layouts bl ON bl.board_type = psls.board_type AND bl.id = psls.layout_id
      JOIN board_product_sizes bps ON bps.board_type = psls.board_type AND bps.id = psls.product_size_id
      JOIN board_sets bs ON bs.board_type = psls.board_type AND bs.id = psls.set_id
      LEFT JOIN (
        SELECT board_type, layout_id, COUNT(*) AS climb_count
        FROM board_climbs
        WHERE is_listed = true AND is_draft = false
        GROUP BY board_type, layout_id
      ) cc ON cc.board_type = psls.board_type AND cc.layout_id = psls.layout_id
      WHERE psls.is_listed = true
        AND bl.is_listed = true
        AND bps.is_listed = true
      GROUP BY psls.board_type, psls.layout_id, bl.name, psls.product_size_id, bps.name, bps.description, cc.climb_count
      ORDER BY climb_count DESC, psls.board_type, bl.name
    `);

    // db.execute() returns QueryResult with .rows for neon-serverless, or an array for postgres-js
    const rowsArray = Array.isArray(rows)
      ? (rows as Array<Record<string, unknown>>)
      : (rows as unknown as { rows: Array<Record<string, unknown>> }).rows;

    console.log(`Found ${rowsArray.length} board configurations:\n`);
    console.table(rowsArray);
  } finally {
    await close();
  }
}

main().catch((err) => {
  console.error('Error running popular board configs query:', err);
  process.exit(1);
});
