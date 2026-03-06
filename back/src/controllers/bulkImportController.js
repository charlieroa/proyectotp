// src/controllers/bulkImportController.js
'use strict';

const XLSX = require('xlsx');
const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const { getGlobalOpenAIKey } = require('../services/openaiKeyService');

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

// ==================== ROW PROCESSORS (helpers) ====================

async function processClientRow(row, tenantId) {
    const firstName = getVal(row, 'nombre', 'first_name', 'name', 'nombre_completo');
    const lastName = getVal(row, 'apellido', 'last_name', 'apellidos');
    const email = getVal(row, 'email', 'correo', 'e_mail');
    const phone = getVal(row, 'telefono', 'phone', 'celular', 'tel');

    if (!firstName) return 'skipped';

    if (email) {
        const existing = await prisma.users.findFirst({
            where: { email: email.toLowerCase(), tenant_id: tenantId },
        });
        if (existing) return 'skipped';
    }

    await prisma.users.create({
        data: {
            tenant_id: tenantId,
            role_id: 4,
            first_name: firstName,
            last_name: lastName || '',
            email: email ? email.toLowerCase() : `client_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@imported.local`,
            phone: phone || null,
            password_hash: await bcrypt.hash('imported_no_login', 10),
        },
    });
    return 'created';
}

async function processStylistRow(row, tenantId) {
    const firstName = getVal(row, 'nombre', 'first_name', 'name');
    const lastName = getVal(row, 'apellido', 'last_name', 'apellidos');
    const email = getVal(row, 'email', 'correo');
    const phone = getVal(row, 'telefono', 'phone', 'celular');
    const commission = getVal(row, 'comision', 'commission', 'porcentaje', 'commission_percent');
    const paymentType = getVal(row, 'tipo_pago', 'payment_type', 'tipo');

    if (!firstName) return 'skipped';

    if (email) {
        const existing = await prisma.users.findFirst({
            where: { email: email.toLowerCase(), tenant_id: tenantId },
        });
        if (existing) return 'skipped';
    }

    await prisma.users.create({
        data: {
            tenant_id: tenantId,
            role_id: 3,
            first_name: firstName,
            last_name: lastName || '',
            email: email ? email.toLowerCase() : `stylist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@imported.local`,
            phone: phone || null,
            password_hash: await bcrypt.hash('imported_no_login', 10),
            commission_percent: commission ? parseFloat(commission) / 100 : 0.5,
            payment_type: paymentType || 'commission',
        },
    });
    return 'created';
}

async function processProductRow(row, tenantId) {
    const name = getVal(row, 'nombre', 'name', 'producto');
    const price = getVal(row, 'precio', 'price', 'valor');
    const stock = getVal(row, 'stock', 'cantidad', 'inventario', 'qty');
    const brand = getVal(row, 'marca', 'brand');

    if (!name) return 'skipped';

    await prisma.products.create({
        data: {
            tenant_id: tenantId,
            name,
            sale_price: price ? parseFloat(price) : 0,
            stock: stock ? parseInt(stock, 10) : 0,
            brand: brand || null,
        },
    });
    return 'created';
}

async function processServiceRow(row, tenantId) {
    const name = getVal(row, 'nombre', 'name', 'servicio', 'service');
    const price = getVal(row, 'precio', 'price', 'valor', 'costo');
    const duration = getVal(row, 'duracion', 'duration', 'duration_minutes', 'minutos', 'tiempo');
    const description = getVal(row, 'descripcion', 'description', 'detalle');
    const category = getVal(row, 'categoria', 'category', 'tipo');

    if (!name) return 'skipped';

    // Check duplicate by name within tenant
    const existing = await prisma.services.findFirst({
        where: { name: { equals: name, mode: 'insensitive' }, tenant_id: tenantId },
    });
    if (existing) return 'skipped';

    let categoryId = null;
    if (category) {
        let cat = await prisma.service_categories.findFirst({
            where: { name: { equals: category, mode: 'insensitive' }, tenant_id: tenantId },
        });
        if (!cat) {
            cat = await prisma.service_categories.create({
                data: { tenant_id: tenantId, name: category },
            });
        }
        categoryId = cat.id;
    }

    await prisma.services.create({
        data: {
            tenant_id: tenantId,
            category_id: categoryId,
            name,
            description: description || null,
            price: price ? parseFloat(price) : 0,
            duration_minutes: duration ? parseInt(duration, 10) : 30,
        },
    });
    return 'created';
}

/**
 * Generic runner: takes rows + a processor function, returns results
 */
async function runImport(rows, tenantId, processFn) {
    const results = { created: 0, skipped: 0, errors: [] };
    for (const row of rows) {
        try {
            const status = await processFn(row, tenantId);
            if (status === 'created') results.created++;
            else results.skipped++;
        } catch (err) {
            results.errors.push(err.message);
        }
    }
    return results;
}

// ==================== IMPORT CLIENTS ====================

exports.importClients = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });

        const tenantId = req.user.tenant_id;
        const rows = parseExcel(req.file.buffer);
        if (rows.length === 0) return res.status(400).json({ error: 'El archivo está vacío.' });

        const results = await runImport(rows, tenantId, processClientRow);

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

        const results = await runImport(rows, tenantId, processStylistRow);

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

        const results = await runImport(rows, tenantId, processProductRow);

        return res.json({
            message: `Importación completada: ${results.created} creados, ${results.skipped} omitidos.`,
            ...results,
        });
    } catch (error) {
        console.error('Error en importProducts:', error);
        return res.status(500).json({ error: 'Error al procesar el archivo.' });
    }
};

// ==================== IMPORT SERVICES ====================

exports.importServices = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });

        const tenantId = req.user.tenant_id;
        const rows = parseExcel(req.file.buffer);
        if (rows.length === 0) return res.status(400).json({ error: 'El archivo está vacío.' });

        const results = await runImport(rows, tenantId, processServiceRow);

        return res.json({
            message: `Importación completada: ${results.created} servicios creados, ${results.skipped} omitidos.`,
            ...results,
        });
    } catch (error) {
        console.error('Error en importServices:', error);
        return res.status(500).json({ error: 'Error al procesar el archivo.' });
    }
};

// ==================== SMART IMPORT (AI-powered) ====================

const PROCESSOR_MAP = {
    clients: processClientRow,
    stylists: processStylistRow,
    products: processProductRow,
    services: processServiceRow,
};

exports.smartImport = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo.' });

        const tenantId = req.user.tenant_id;
        const rows = parseExcel(req.file.buffer);
        if (rows.length === 0) return res.status(400).json({ error: 'El archivo está vacío.' });

        // 1. Extract headers + sample rows for GPT
        const headers = Object.keys(rows[0]);
        const sampleRows = rows.slice(0, 3).map(r => {
            const obj = {};
            for (const h of headers) obj[h] = r[h];
            return obj;
        });

        // 2. Call GPT-4o-mini to classify
        const apiKey = await getGlobalOpenAIKey();
        if (!apiKey) {
            return res.status(400).json({ error: 'No hay API Key de OpenAI configurada.' });
        }

        const classifyPrompt = `Eres un clasificador de datos para un sistema de gestión de salones de belleza.
Te doy las columnas y 3 filas de ejemplo de un archivo Excel. Determina qué tipo de datos contiene.

Columnas: ${JSON.stringify(headers)}
Ejemplo de filas: ${JSON.stringify(sampleRows)}

Responde SOLO con un JSON con este formato:
{
  "type": "clients" | "stylists" | "products" | "services",
  "confidence": 0.0 a 1.0,
  "reasoning": "explicación breve",
  "column_mapping": {
    "columna_original": "columna_destino"
  }
}

Columnas destino posibles:
- clients: nombre, apellido, email, telefono
- stylists: nombre, apellido, email, telefono, comision, tipo_pago
- products: nombre, precio, stock, marca
- services: nombre, precio, duracion, descripcion, categoria`;

        const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                response_format: { type: 'json_object' },
                messages: [{ role: 'user', content: classifyPrompt }],
                temperature: 0.1,
                max_tokens: 500,
            }),
        });

        if (!gptResponse.ok) {
            const err = await gptResponse.text();
            console.error('GPT classify error:', err);
            return res.status(500).json({ error: 'Error al clasificar el archivo con IA.' });
        }

        const gptData = await gptResponse.json();
        const classification = JSON.parse(gptData.choices[0].message.content);

        const { type, confidence, reasoning, column_mapping } = classification;

        if (!PROCESSOR_MAP[type]) {
            return res.status(400).json({
                error: `Tipo detectado "${type}" no es válido. Tipos soportados: clients, stylists, products, services.`,
            });
        }

        // 3. Remap rows using column_mapping
        const remappedRows = rows.map(originalRow => {
            const newRow = {};
            for (const [origCol, destCol] of Object.entries(column_mapping)) {
                if (originalRow[origCol] !== undefined) {
                    newRow[destCol] = originalRow[origCol];
                }
            }
            // Also keep original columns (processor uses getVal which normalizes)
            for (const [col, val] of Object.entries(originalRow)) {
                if (!newRow[col]) newRow[col] = val;
            }
            return newRow;
        });

        // 4. Process with the right helper
        const results = await runImport(remappedRows, tenantId, PROCESSOR_MAP[type]);

        const typeLabels = {
            clients: 'Clientes',
            stylists: 'Estilistas',
            products: 'Productos',
            services: 'Servicios',
        };

        return res.json({
            message: `Importación inteligente completada: ${results.created} ${typeLabels[type]} creados, ${results.skipped} omitidos.`,
            detectedType: type,
            typeLabel: typeLabels[type],
            confidence: Math.round(confidence * 100),
            reasoning,
            ...results,
        });
    } catch (error) {
        console.error('Error en smartImport:', error);
        return res.status(500).json({ error: 'Error al procesar el archivo con importación inteligente.' });
    }
};
