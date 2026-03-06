require("dotenv").config();
const db = require("./src/config/db");
(async () => {
  const r = await db.query("SELECT sc.id, sc.name, sc.tenant_id, t.name as tenant_name FROM service_categories sc LEFT JOIN tenants t ON sc.tenant_id = t.id WHERE sc.id = $1", ["90e9daca-49a5-4517-899f-31a659a8899b"]);
  console.log("Categoria Cortes:", r.rows[0]);

  // Check all categories for bunker barber shop 109
  const tid109 = "4a7ae530-1563-4417-a889-d43a080aad88";
  const tidBunker = "0f2072f1-c057-4424-8728-984e159b2424";

  for (const [label, tid] of [["bunker 109", tid109], ["BUNKER BARBERSHOP", tidBunker]]) {
    console.log("\n=== " + label + " (" + tid + ") ===");
    const cats = await db.query("SELECT id, name FROM service_categories WHERE tenant_id = $1", [tid]);
    console.log("Categorias:", cats.rows.map(c => c.name + " (" + c.id + ")").join(", ") || "NINGUNA");
    const svcs = await db.query("SELECT s.name, s.category_id, sc.name as cat FROM services s LEFT JOIN service_categories sc ON s.category_id = sc.id WHERE s.tenant_id = $1", [tid]);
    console.log("Servicios:", svcs.rows.map(s => s.name + " → " + (s.cat || "SIN CAT")).join(", ") || "NINGUNO");
  }
  process.exit(0);
})();
