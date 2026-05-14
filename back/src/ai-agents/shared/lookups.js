'use strict';

const db = require('../../config/db');

// Strip accents for fuzzy matching (Postgres `unaccent` extension is not installed).
function stripAccents(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const NORM_TRANSLATE_FROM = 'áéíóúüñÁÉÍÓÚÜÑ';
const NORM_TRANSLATE_TO   = 'aeiouunAEIOUUN';

async function findStylist(tenantId, query) {
    if (!query) return null;
    const q = stripAccents(query);
    const { rows } = await db.query(`
        SELECT id, first_name, last_name, email, phone, commission_rate, payment_type, base_salary, working_hours
        FROM users
        WHERE tenant_id = $1::uuid AND role_id = 3
          AND COALESCE(NULLIF(status,''),'active') = 'active'
          AND LOWER(translate(CONCAT(first_name, ' ', COALESCE(last_name,'')), $5, $6)) LIKE $2
        ORDER BY
          CASE WHEN LOWER(translate(first_name, $5, $6)) = $3 THEN 0
               WHEN LOWER(translate(first_name, $5, $6)) LIKE $4 THEN 1
               ELSE 2 END,
          first_name
        LIMIT 1
    `, [tenantId, `%${q}%`, q, `${q}%`, NORM_TRANSLATE_FROM, NORM_TRANSLATE_TO]);
    return rows[0] || null;
}

async function findClient(tenantId, query) {
    if (!query) return null;
    const q = stripAccents(query);
    const { rows } = await db.query(`
        SELECT id, first_name, last_name, email, phone
        FROM users
        WHERE tenant_id = $1::uuid AND role_id = 4
          AND COALESCE(NULLIF(status,''),'active') = 'active'
          AND (LOWER(translate(CONCAT(first_name, ' ', COALESCE(last_name,'')), $3, $4)) LIKE $2
               OR phone LIKE $2)
        ORDER BY first_name
        LIMIT 5
    `, [tenantId, `%${q}%`, NORM_TRANSLATE_FROM, NORM_TRANSLATE_TO]);
    return rows;
}

async function findService(tenantId, query) {
    if (!query) return null;
    const q = stripAccents(query);
    const { rows } = await db.query(`
        SELECT id, name, price, duration_minutes, commission_percent
        FROM services
        WHERE tenant_id = $1::uuid AND LOWER(translate(name, $3, $4)) LIKE $2
        LIMIT 5
    `, [tenantId, `%${q}%`, NORM_TRANSLATE_FROM, NORM_TRANSLATE_TO]);
    return rows;
}

async function findProduct(tenantId, query) {
    if (!query) return null;
    const q = stripAccents(query);
    const { rows } = await db.query(`
        SELECT id, name, sale_price, cost_price, stock, audience_type, product_commission_percent, is_active
        FROM products
        WHERE tenant_id = $1::uuid AND is_active = true AND LOWER(translate(name, $3, $4)) LIKE $2
        LIMIT 5
    `, [tenantId, `%${q}%`, NORM_TRANSLATE_FROM, NORM_TRANSLATE_TO]);
    return rows;
}

async function getOpenCashSession(tenantId, userId) {
    const { rows } = await db.query(`
        SELECT id, opened_by_user_id, opened_at, initial_amount, status
        FROM cash_sessions
        WHERE tenant_id = $1::uuid AND status = 'OPEN'
        ORDER BY opened_at DESC
        LIMIT 1
    `, [tenantId]);
    return rows[0] || null;
}

async function getTenantInfo(tenantId) {
    const { rows } = await db.query(`
        SELECT id, name, email, phone, address, city, website, working_hours, plan, business_type, tip_salon_percent, geofence_radius
        FROM tenants WHERE id = $1::uuid
    `, [tenantId]);
    return rows[0] || null;
}

async function getDefaultAdmin(tenantId) {
    const { rows } = await db.query(`
        SELECT id, first_name, last_name, email
        FROM users
        WHERE tenant_id = $1::uuid AND role_id IN (1, 2)
          AND COALESCE(NULLIF(status,''),'active') = 'active'
        ORDER BY role_id, created_at
        LIMIT 1
    `, [tenantId]);
    return rows[0] || null;
}

module.exports = {
    findStylist,
    findClient,
    findService,
    findProduct,
    getOpenCashSession,
    getTenantInfo,
    getDefaultAdmin,
};
