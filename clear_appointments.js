const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('--- LIMPIEZA DE CITAS (Carlos Roa / Mañana) ---');

// 1. Locate .env in server/ or current
const possibleEnv = ['./server/.env', './.env', '../.env'];
let envPath = '';
for (const p of possibleEnv) {
    if (fs.existsSync(p)) { envPath = p; break; }
}

if (envPath) {
    console.log('Loading .env from:', envPath);
    require('dotenv').config({ path: path.resolve(envPath) });
} else {
    console.log('WARNING: .env not found. Trying defaults...');
}

// 2. Locate db.js
// We know it is likely in ./server/src/config/db.js from previous ls
const possibleDb = ['./server/src/config/db.js', './src/config/db.js'];
let dbPath = '';
for (const p of possibleDb) {
    if (fs.existsSync(p)) { dbPath = p; break; }
}

if (!dbPath) {
    console.error('CRITICAL: Could not find db.js in expected paths.');
    process.exit(1);
}

const db = require(path.resolve(dbPath));
const { formatInTimeZone } = require('date-fns-tz');
const TIME_ZONE = 'America/Bogota';

(async () => {
    try {
        // Find Carlos
        const userRes = await db.query("SELECT id, first_name, last_name FROM users WHERE first_name ILIKE '%Carlos%' AND last_name ILIKE '%Roa%'");
        if (userRes.rows.length === 0) {
            console.log('Carlos Roa not found.');
            process.exit(0);
        }
        const carlosId = userRes.rows[0].id;

        // Date constants
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowStr = formatInTimeZone(tomorrow, TIME_ZONE, 'yyyy-MM-dd');

        console.log(`Clearing appointments for Stylist ${carlosId} on ${tomorrowStr}...`);

        // Check before delete
        const check = await db.query(`
            SELECT id, start_time, status FROM appointments 
            WHERE stylist_id = $1 
            AND start_time >= ($2 || ' 00:00:00')::timestamp 
            AND start_time <= ($2 || ' 23:59:59')::timestamp
        `, [carlosId, tomorrowStr]);

        console.log(`Found ${check.rows.length} conflicting appointments.`);

        if (check.rows.length > 0) {
            // DELETE
            const del = await db.query(`
                DELETE FROM appointments 
                WHERE stylist_id = $1 
                AND start_time >= ($2 || ' 00:00:00')::timestamp 
                AND start_time <= ($2 || ' 23:59:59')::timestamp
            `, [carlosId, tomorrowStr]);
            console.log(`✅ DELETED ${del.rowCount} appointments.`);
        } else {
            console.log('No appointments to delete.');
        }

        process.exit(0);
    } catch (e) {
        console.error('Error:', e);
        process.exit(1);
    }
})();
