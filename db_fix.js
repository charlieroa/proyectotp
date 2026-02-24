require("dotenv").config();
const db = require("./src/config/db");

async function fix() {
  try {
    // Check if reminder columns exist
    const colCheck = await db.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'appointments' AND column_name IN ('reminder_sent_1h', 'reminder_sent_24h')
    `);
    const existing = colCheck.rows.map(r => r.column_name);

    if (!existing.includes('reminder_sent_1h')) {
      await db.query("ALTER TABLE appointments ADD COLUMN reminder_sent_1h BOOLEAN DEFAULT FALSE");
      console.log("Added column: reminder_sent_1h");
    } else {
      console.log("Column reminder_sent_1h already exists");
    }

    if (!existing.includes('reminder_sent_24h')) {
      await db.query("ALTER TABLE appointments ADD COLUMN reminder_sent_24h BOOLEAN DEFAULT FALSE");
      console.log("Added column: reminder_sent_24h");
    } else {
      console.log("Column reminder_sent_24h already exists");
    }

    // Check schedule_blocks table
    const tableCheck = await db.query(`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'schedule_blocks'
    `);
    if (tableCheck.rows.length === 0) {
      await db.query(`
        CREATE TABLE schedule_blocks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          stylist_id UUID NOT NULL REFERENCES users(id),
          tenant_id UUID NOT NULL REFERENCES tenants(id),
          block_type VARCHAR(50) NOT NULL DEFAULT 'leave',
          title VARCHAR(255),
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'pending',
          admin_notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      console.log("Created table: schedule_blocks");
    } else {
      console.log("Table schedule_blocks already exists");
    }

    // Clean up test data
    const del1 = await db.query("DELETE FROM users WHERE email IN ('testprueba999@test.com', 'testx@testx.com')");
    const del2 = await db.query("DELETE FROM tenants WHERE slug IN ('test-salon-prueba', 'testx')");
    console.log("Cleaned test data: " + del1.rowCount + " users, " + del2.rowCount + " tenants");

    // Show final counts
    const counts = await db.query("SELECT (SELECT count(*) FROM tenants) as tenants, (SELECT count(*) FROM users) as users, (SELECT count(*) FROM appointments) as appointments, (SELECT count(*) FROM services) as services, (SELECT count(*) FROM invoices) as invoices, (SELECT count(*) FROM products) as products");
    console.log("\n=== DB STATS ===");
    console.log(JSON.stringify(counts.rows[0], null, 2));

    process.exit(0);
  } catch(e) {
    console.error("ERROR:", e.message);
    process.exit(1);
  }
}
fix();
