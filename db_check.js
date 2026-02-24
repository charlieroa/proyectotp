require("dotenv").config();
const db = require("./src/config/db");

async function check() {
  try {
    // Tables
    const tables = await db.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
    console.log("=== TABLAS ===");
    tables.rows.forEach(t => console.log(t.tablename));

    // Tenants
    const tenants = await db.query("SELECT id, name, email, slug, created_at FROM tenants LIMIT 10");
    console.log("\n=== TENANTS ===");
    console.log(JSON.stringify(tenants.rows, null, 2));

    // Users
    const users = await db.query("SELECT id, first_name, email, role_id, tenant_id FROM users LIMIT 10");
    console.log("\n=== USERS ===");
    console.log(JSON.stringify(users.rows, null, 2));

    // Counts
    const counts = await db.query("SELECT (SELECT count(*) FROM tenants) as tenants, (SELECT count(*) FROM users) as users");
    console.log("\n=== COUNTS ===");
    console.log(JSON.stringify(counts.rows[0], null, 2));

    process.exit(0);
  } catch(e) {
    console.error("ERROR:", e.message);
    process.exit(1);
  }
}
check();
