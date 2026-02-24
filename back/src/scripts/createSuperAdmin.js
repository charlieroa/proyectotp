/**
 * Script to create the super admin user.
 * Run: node src/scripts/createSuperAdmin.js
 *
 * Make sure .env is configured with DATABASE_URL or PG* variables.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const EMAIL = 'superadmin@tupelukeria.com';
const PASSWORD = 'SuperAdmin2025!'; // Change before running in production

(async () => {
  try {
    const existing = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = $1',
      [EMAIL.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      console.log('Super admin already exists. Skipping.');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(PASSWORD, salt);

    await db.query(
      `INSERT INTO users (tenant_id, role_id, first_name, last_name, email, password_hash)
       VALUES (NULL, 5, 'Super', 'Admin', $1, $2)`,
      [EMAIL, hash]
    );

    console.log(`Super admin created: ${EMAIL}`);
    process.exit(0);
  } catch (err) {
    console.error('Error creating super admin:', err.message);
    process.exit(1);
  }
})();
