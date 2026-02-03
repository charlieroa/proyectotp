const { execSync } = require('child_process');
const path = require('path');

try {
    console.log('--- DEBUG AVAILABILITY ---');

    // 1. Load .env
    const envCmd = process.platform === 'win32' ? 'dir /s /b .env' : 'find . -name .env -maxdepth 3';
    let envPath = '';
    try {
        const out = execSync(envCmd).toString().trim();
        envPath = out.split('\n')[0].trim();
    } catch (e) { }

    if (envPath) {
        require('dotenv').config({ path: path.resolve(envPath) });
    }

    // 2. Load db.js
    const dbCmd = process.platform === 'win32' ? 'dir /s /b db.js' : 'find . -name db.js -maxdepth 3';
    const dbOut = execSync(dbCmd).toString().trim();
    const dbPath = dbOut.split('\n')[0].trim();
    const db = require(path.resolve(dbPath));
    const { formatInTimeZone, toDate } = require('date-fns-tz'); // Assuming valid package
    const TIME_ZONE = 'America/Bogota';

    // 3. Logic to test (from whatsappController.js)
    const checkStylistWorksAtTime = (stylistWorkingHours, fecha, hora) => {
        try {
            if (!stylistWorkingHours) return false;
            const wh = typeof stylistWorkingHours === 'string'
                ? JSON.parse(stylistWorkingHours)
                : stylistWorkingHours;

            // FIX: Use TIME_ZONE for day of week
            const targetDate = toDate(fecha, { timeZone: TIME_ZONE });
            const dayNum = parseInt(formatInTimeZone(targetDate, TIME_ZONE, 'i')) % 7; // 1-7 (ISO) -> 0=Sun..6=Sat?? 
            // 'i' is ISO day (1=Mon...7=Sun). getDay() is 0=Sun...6=Sat.
            // Let's stick to what the original code did: new Date(y, m-1, d).getDay()
            // But checking if that's the issue.

            // Original code simulation:
            const [year, month, day] = fecha.split('-').map(Number);
            const fechaDate = new Date(year, month - 1, day);
            const originalDayNum = fechaDate.getDay();

            const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
            const dayKey = dayNames[originalDayNum];

            console.log(`Checking ${fecha} (${dayKey}):`);
            console.log(`  Working Hours:`, JSON.stringify(wh[dayKey]));

            const schedule = wh[dayKey];
            if (!schedule) return false;

            let startWork, endWork;
            if (typeof schedule === 'object' && schedule.start) {
                startWork = schedule.start.replace(':', '');
                endWork = schedule.end.replace(':', '');
            } else if (typeof schedule === 'string' && schedule.includes('-')) {
                const [start, end] = schedule.split('-');
                startWork = start.replace(':', '');
                endWork = end.replace(':', '');
            } else {
                return true;
            }

            if (hora) {
                const horaNum = hora.replace(':', '');
                console.log(`  Comparing ${horaNum} vs ${startWork}-${endWork}`);
                if (horaNum < startWork || horaNum >= endWork) {
                    return false;
                }
            }
            return true;
        } catch (e) {
            console.log('Error in check:', e.message);
            return true;
        }
    };

    (async () => {
        try {
            // Find Sofia
            const userRes = await db.query("SELECT id, first_name, last_name, working_hours FROM users WHERE first_name ILIKE '%Sofia%'");
            if (userRes.rows.length === 0) {
                console.log('Sofia NOT found');
                process.exit(0);
            }
            const sofia = userRes.rows[0];
            console.log(`Found: ${sofia.first_name} ${sofia.last_name || ''}`);
            console.log('Working Hours JSON:', JSON.stringify(sofia.working_hours, null, 2));

            // Test Tomorrow
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Simple tomorrow
            const tomorrowStr = formatInTimeZone(tomorrow, TIME_ZONE, 'yyyy-MM-dd');

            console.log(`\nTesting for TOMORROW: ${tomorrowStr} at 15:00 (3 PM)`);
            const isAvailable = checkStylistWorksAtTime(sofia.working_hours, tomorrowStr, '15:00');
            console.log(`Result: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);

            process.exit(0);
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    })();

} catch (e) {
    console.error(e);
}
