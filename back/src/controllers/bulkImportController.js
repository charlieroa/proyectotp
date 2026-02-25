// src/controllers/bulkImportController.js
'use strict';

const XLSX = require('xlsx');
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');

/**
 * Parse Excel buffer and return array of row objects.
 */
function parseExcel(buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

/**
 * Normalize column name: lowercase, trim, remove accents
 */
function normalizeCol(col) {
    return String(col).toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '_');
}

/**
 * Get value from row by trying multiple possible column names
 */
function getVal(row, ...keys) {
    for (const key of keys) {
        for (const [col, val] of Object.entries(row)) {
            if (normalizeCol(col) === key && val !== '') return String(val).trim();
        }
    }
    return null;
}

// ==================== IMPORT CLIENTS ====================

exports.importClients = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });

        const tenantId = req.user.tenant_id;
        const rows = parseExcel(req.file.buffer);

        if (rows.length === 0) return res.status(400).json({ error: 'El archivo está vacío.' });

        const results = { created: 0, skipped: 0, errors: [] };

        for (const row of rows) {
            try {
                const firstName = getVal(row, 'nombre', 'first_name', 'name', 'nombre_completo');
                const lastName = getVal(row, 'apellido', 'last_name', 'apellidos');
                const email = getVal(row, 'email', 'correo', 'e_mail');
                const phone = getVal(row, 'telefono', 'phone', 'celular', 'tel');

                if (!firstName) {
                    results.skipped++;
                    continue;
                }

                // Check duplicate by email within tenant
                if (email) {
                    const existing = await prisma.users.findFirst({
                        where: { email: email.toLowerCase(), tenant_id: tenantId },
                    });
                    if (existing) {
                        results.skipped++;
                        continue;
                    }
                }

                await prisma.users.create({
                    data: {
                        tenant_id: tenantId,
                        role_id: 4, // Client
                        first_name: firstName,
                        last_name: lastName || '',
                        email: email ? email.toLowerCase() : `client_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@imported.local`,
                        phone: phone || null,
                        password_hash: await bcrypt.hash('imported_no_login', 10),
                    },
                });
                results.created++;
            } catch (err) {
                results.errors.push(err.message);
            }
        }

        return res.json({
            message: `Importación completada: ${results.created} creados, ${results.skipped} omitidos.`,
            ...results,
        });
    } catch (error) {
        console.error('Error en importClients:', error);
        return res.status(500).json({ error: 'Error al procesar el archivo.' });
    }
};

// ==================== IMPORT STYLISTS ====================

exports.importStylists = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });

        const tenantId = req.user.tenant_id;
        const rows = parseExcel(req.file.buffer);

        if (rows.length === 0) return res.status(400).json({ error: 'El archivo está vacío.' });

        const results = { created: 0, skipped: 0, errors: [] };

        for (const row of rows) {
            try {
                const firstName = getVal(row, 'nombre', 'first_name', 'name');
                const lastName = getVal(row, 'apellido', 'last_name', 'apellidos');
                const email = getVal(row, 'email', 'correo');
                const phone = getVal(row, 'telefono', 'phone', 'celular');
                const commission = getVal(row, 'comision', 'commission', 'porcentaje', 'commission_percent');
                const paymentType = getVal(row, 'tipo_pago', 'payment_type', 'tipo');

                if (!firstName) {
                    results.skipped++;
                    continue;
                }

                if (email) {
                    const existing = await prisma.users.findFirst({
                        where: { email: email.toLowerCase(), tenant_id: tenantId },
                    });
                    if (existing) {
                        results.skipped++;
                        continue;
                    }
                }

                await prisma.users.create({
                    data: {
                        tenant_id: tenantId,
                        role_id: 3, // Stylist
                        first_name: firstName,
                        last_name: lastName || '',
                        email: email ? email.toLowerCase() : `stylist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@imported.local`,
                        phone: phone || null,
                        password_hash: await bcrypt.hash('imported_no_login', 10),
                        commission_percent: commission ? parseFloat(commission) / 100 : 0.5,
                        payment_type: paymentType || 'commission',
                    },
                });
                results.created++;
            } catch (err) {
                results.errors.push(err.message);
            }
        }

        return res.json({
            message: `Importación completada: ${results.created} creados, ${results.skipped} omitidos.`,
            ...results,
        });
    } catch (error) {
        console.error('Error en importStylists:', error);
        return res.status(500).json({ error: 'Error al procesar el archivo.' });
    }
};

// ==================== IMPORT PRODUCTS ====================

exports.importProducts = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });

        const tenantId = req.user.tenant_id;
        const rows = parseExcel(req.file.buffer);

        if (rows.length === 0) return res.status(400).json({ error: 'El archivo está vacío.' });

        const results = { created: 0, skipped: 0, errors: [] };

        for (const row of rows) {
            try {
                const name = getVal(row, 'nombre', 'name', 'producto');
                const price = getVal(row, 'precio', 'price', 'valor');
                const stock = getVal(row, 'stock', 'cantidad', 'inventario', 'qty');
                const brand = getVal(row, 'marca', 'brand');

                if (!name) {
                    results.skipped++;
                    continue;
                }

                await prisma.products.create({
                    data: {
                        tenant_id: tenantId,
                        name,
                        sale_price: price ? parseFloat(price) : 0,
                        stock: stock ? parseInt(stock, 10) : 0,
                        brand: brand || null,
                    },
                });
                results.created++;
            } catch (err) {
                results.errors.push(err.message);
            }
        }

        return res.json({
            message: `Importación completada: ${results.created} creados, ${results.skipped} omitidos.`,
            ...results,
        });
    } catch (error) {
        console.error('Error en importProducts:', error);
        return res.status(500).json({ error: 'Error al procesar el archivo.' });
    }
};
