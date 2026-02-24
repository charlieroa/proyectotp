require("dotenv").config();
const db = require("./src/config/db");

async function cleanup() {
  try {
    await db.query("DELETE FROM users WHERE email = 'testprueba999@test.com'");
    await db.query("DELETE FROM tenants WHERE slug = 'test-salon-prueba'");
    console.log("Test data cleaned up");
    process.exit(0);
  } catch(e) {
    console.error("ERROR:", e.message);
    process.exit(1);
  }
}
cleanup();
