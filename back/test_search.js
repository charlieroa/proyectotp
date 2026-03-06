require("dotenv").config();
const db = require("./src/config/db");
(async () => {
  const tid = "0f2072f1-c057-4424-8728-984e159b2424"; // BUNKER BARBERSHOP
  const serviceName = "corte";
  const serviceNameNormalized = "corte";

  // Test category match
  console.log("1. Testing category match for 'corte'...");
  try {
    const catMatch = await db.query(
      `SELECT sc.id, sc.name,
              CASE
                WHEN LOWER(TRIM(sc.name)) = $2 THEN 1
                WHEN LOWER(TRIM(sc.name)) = $3 THEN 2
                WHEN LOWER(TRIM(sc.name)) LIKE $4 THEN 3
                ELSE 4
              END AS priority
       FROM service_categories sc
       WHERE sc.tenant_id = $1::uuid
         AND (
           LOWER(TRIM(sc.name)) = $2
           OR LOWER(TRIM(sc.name)) = $3
           OR LOWER(TRIM(sc.name)) LIKE $4
           OR LOWER(TRIM(sc.name)) LIKE $5
         )
         AND EXISTS (
           SELECT 1 FROM services s
           INNER JOIN stylist_services ss ON s.id = ss.service_id
           INNER JOIN users u ON ss.user_id = u.id
           WHERE s.category_id = sc.id AND s.tenant_id = $1::uuid
             AND u.role_id = 3 AND COALESCE(NULLIF(u.status, ''), 'active') = 'active'
         )
       ORDER BY priority ASC
       LIMIT 1`,
      [tid, serviceName, serviceNameNormalized, `${serviceName}%`, `%${serviceNameNormalized}%`]
    );
    console.log("   Category match:", catMatch.rows.length > 0 ? catMatch.rows[0] : "NONE");
  } catch(e) {
    console.log("   ERROR:", e.message);
  }

  // Test service name match
  console.log("\n2. Testing service name match for 'corte'...");
  try {
    const result = await db.query(
      `SELECT DISTINCT s.id, s.name, s.price
       FROM services s
       INNER JOIN stylist_services ss ON s.id = ss.service_id
       INNER JOIN users u ON ss.user_id = u.id
       WHERE s.tenant_id = $1::uuid
         AND u.tenant_id = $1::uuid
         AND u.role_id = 3
         AND COALESCE(NULLIF(u.status, ''), 'active') = 'active'
         AND LOWER(TRIM(s.name)) LIKE $2
       ORDER BY s.name ASC
       LIMIT 10`,
      [tid, `%${serviceName}%`]
    );
    console.log("   Service match:", result.rows);
  } catch(e) {
    console.log("   ERROR:", e.message);
  }

  process.exit(0);
})();
