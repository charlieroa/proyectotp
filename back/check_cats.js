require("dotenv").config();
const db = require("./src/config/db");
(async () => {
  const tid = "4a7ae530-1563-4417-a889-d43a080aad88";
  const cats = await db.query("SELECT id, name FROM service_categories WHERE tenant_id = $1", [tid]);
  console.log("CATEGORIAS:");
  for (const c of cats.rows) {
    const svcs = await db.query("SELECT s.name, s.id FROM services s WHERE s.tenant_id = $1 AND s.category_id = $2", [tid, c.id]);
    console.log("  " + c.name + ": " + svcs.rows.map(s=>s.name).join(", "));
  }
  const allSvcs = await db.query("SELECT s.id, s.name, s.category_id FROM services s WHERE s.tenant_id = $1 ORDER BY s.name", [tid]);
  console.log("\nSERVICIOS:");
  for (const s of allSvcs.rows) {
    const ss = await db.query("SELECT COUNT(*)::int as cnt FROM stylist_services WHERE service_id = $1", [s.id]);
    console.log("  " + s.name + " | cat:" + s.category_id + " | estilistas:" + ss.rows[0].cnt);
  }
  process.exit(0);
})();
