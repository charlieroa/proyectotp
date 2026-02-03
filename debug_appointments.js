const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

try {
    console.log('--- DIAGNOSTICO v3 ---');

    // 1. Find and Load .env
    const envCmd = process.platform === 'win32' ? 'dir /s /b .env' : 'find . -name .env -maxdepth 3';
    let envPath = '';
    try {
        const out = execSync(envCmd).toString().trim();
        envPath = out.split('\n')[0].trim();
        console.log('Found .env at:', envPath);
    } catch (e) { }

    if (envPath) {
        require('dotenv').config({ path: path.resolve(envPath) });
        console.log('Loaded .env');
    } else {
        console.log('WARNING: .env not found. DB might fail.');
    }

    // 2. Find and Load db.js
    const dbCmd = process.platform === 'win32' ? 'dir /s /b db.js' : 'find . -name db.js -maxdepth 3';
    const dbOut = execSync(dbCmd).toString().trim();
    const dbPath = dbOut.split('\n')[0].trim();
    if (!dbPath) throw new Error('db.js not found');

    console.log('Loading DB from:', dbPath);
    const db = require(path.resolve(dbPath));
    const { formatInTimeZone } = require('date-fns-tz');
    const TIME_ZONE = 'America/Bogota';

    (async () => {
        try {
            console.log('Connecting to DB...');
            // Carlos Roa check
            const userRes = await db.query("SELECT id, first_name, last_name FROM users WHERE first_name ILIKE '%Carlos%' AND last_name ILIKE '%Roa%'");
            if (userRes.rows.length === 0) {
                console.log('Carlos NOT found');
            } else {
                const carlosId = userRes.rows[0].id;
                console.log('Carlos ID found:', carlosId);

                // Tomorrow
                const now = new Date();
                const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
                const tomorrowStr = formatInTimeZone(tomorrow, TIME_ZONE, 'yyyy-MM-dd');
                console.log('Checking appointments for:', tomorrowStr);

                const apps = await db.query(`
                    SELECT id, start_time, end_time, status 
                    FROM appointments 
                    WHERE stylist_id = $1 
                    AND start_time >= ($2 || ' 00:00:00')::timestamp 
                    AND start_time <= ($2 || ' 23:59:59')::timestamp
                    ORDER BY start_time
                `, [carlosId, tomorrowStr]);

                console.log(`\n=== RESULTS (${apps.rows.length} citas) ===`);
                apps.rows.forEach(a => {
                    const s = formatInTimeZone(new Date(a.start_time), TIME_ZONE, 'HH:mm');
                    const e = formatInTimeZone(new Date(a.end_time), TIME_ZONE, 'HH:mm');
                    console.log(`[${a.status}] ${s} - ${e} (UTC: ${new Date(a.start_time).toISOString()})`);
                });
            }
            process.exit(0);
        } catch (e) {
            console.error('DB/Query Error:', e);
            process.exit(1);
        }
    })();

} catch (e) {
    console.error('Script Critical Error:', e);
}
