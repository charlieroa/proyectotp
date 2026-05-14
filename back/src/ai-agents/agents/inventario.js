'use strict';

const db = require('../../config/db');
const { findProduct } = require('../shared/lookups');
const { getPeriodDays } = require('../shared/helpers');

const systemPrompt = `Eres el AGENTE DE INVENTARIO. Manejas PRODUCTOS, STOCK, CATEGORÍAS DE PRODUCTOS.

PERSONALIDAD:
- "Listo jefe", "Como ordene jefe".
- Confirma antes de crear/editar productos o ajustar stock importante.

REGLAS:
- Productos requieren: nombre + precio_venta (mínimo). Opcional: precio_costo, stock inicial, categoría.
- Para ajustar stock: tipo='entrada' (compra/reposición) o 'salida' (merma/dañado/ajuste).
- Stock bajo: muestra productos con menos de N unidades (default 5).
- Si te piden cobrar productos, eso lo hace el agente POS — redirige.`;

const tools = [
    {
        type: 'function',
        function: {
            name: 'listar_productos',
            description: 'Lista productos activos con stock y precio.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'crear_producto',
            description: 'Crea un producto.',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string' },
                    precio_venta: { type: 'number' },
                    precio_costo: { type: 'number' },
                    stock: { type: 'integer' },
                    categoria: { type: 'string' },
                    audiencia: { type: 'string', enum: ['cliente', 'estilista', 'ambos'], description: 'Cliente=para venta al público, estilista=para que estilistas compren con descuento.' },
                },
                required: ['nombre', 'precio_venta'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'editar_producto',
            description: 'Edita un producto existente. Pasa solo los campos a cambiar.',
            parameters: {
                type: 'object',
                properties: {
                    producto: { type: 'string' },
                    nuevo_nombre: { type: 'string' },
                    precio_venta: { type: 'number' },
                    precio_costo: { type: 'number' },
                },
                required: ['producto'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ajustar_stock',
            description: 'Ajusta el stock de un producto (entrada o salida).',
            parameters: {
                type: 'object',
                properties: {
                    producto: { type: 'string' },
                    cantidad: { type: 'integer', description: 'Cantidad a sumar o restar (positiva)' },
                    tipo: { type: 'string', enum: ['entrada', 'salida'] },
                    motivo: { type: 'string', description: 'Razón del ajuste (compra, dañado, etc.)' },
                },
                required: ['producto', 'cantidad', 'tipo'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'ver_stock_bajo',
            description: 'Lista productos con stock por debajo del umbral.',
            parameters: {
                type: 'object',
                properties: { umbral: { type: 'integer', description: 'Default 5' } },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'productos_mas_vendidos',
            description: 'Ranking de productos más vendidos en un periodo.',
            parameters: {
                type: 'object',
                properties: { periodo: { type: 'string', description: "'semana', 'mes' o 'año'. Default mes." } },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'crear_categoria_producto',
            description: 'Crea una categoría de producto.',
            parameters: {
                type: 'object',
                properties: {
                    nombre: { type: 'string' },
                    comision_default: { type: 'number', description: 'Comisión default para productos de esta categoría (opcional)' },
                },
                required: ['nombre'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'listar_categorias_producto',
            description: 'Lista las categorías de producto.',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
];

const executors = {
    async listar_productos(args, { tenantId }) {
        const { rows } = await db.query(`
            SELECT id, name, sale_price, cost_price, stock, audience_type, is_active
            FROM products WHERE tenant_id = $1::uuid AND is_active = true
            ORDER BY name
        `, [tenantId]);
        return { total: rows.length, productos: rows };
    },

    async crear_producto(args, { tenantId }) {
        let categoryId = null;
        if (args.categoria) {
            const { rows } = await db.query(`SELECT id FROM product_categories WHERE tenant_id = $1::uuid AND LOWER(name) = LOWER($2) LIMIT 1`, [tenantId, args.categoria]);
            if (rows.length) categoryId = rows[0].id;
        }
        const { rows } = await db.query(`
            INSERT INTO products (tenant_id, name, sale_price, cost_price, stock, is_active, audience_type, category_id)
            VALUES ($1::uuid, $2, $3, $4, $5, true, $6, $7)
            RETURNING id, name, sale_price, stock
        `, [tenantId, args.nombre, args.precio_venta, args.precio_costo || 0, args.stock || 0, args.audiencia || 'cliente', categoryId]);
        return { success: true, producto: rows[0] };
    },

    async editar_producto(args, { tenantId }) {
        const products = await findProduct(tenantId, args.producto);
        if (!products?.length) return { error: `No encontré el producto "${args.producto}".` };
        const p = products[0];
        const updates = [];
        const values = [];
        let i = 1;
        if (args.nuevo_nombre)            { updates.push(`name = $${i++}`);       values.push(args.nuevo_nombre); }
        if (args.precio_venta !== undefined) { updates.push(`sale_price = $${i++}`); values.push(args.precio_venta); }
        if (args.precio_costo !== undefined) { updates.push(`cost_price = $${i++}`); values.push(args.precio_costo); }
        if (!updates.length) return { error: 'No hay cambios.' };
        values.push(p.id);
        await db.query(`UPDATE products SET ${updates.join(', ')} WHERE id = $${i}::uuid`, values);
        return { success: true, mensaje: `Producto "${p.name}" actualizado.` };
    },

    async ajustar_stock(args, { tenantId, userId }) {
        const products = await findProduct(tenantId, args.producto);
        if (!products?.length) return { error: `No encontré el producto "${args.producto}".` };
        const p = products[0];
        const isOut = args.tipo === 'salida';
        const delta = isOut ? -Math.abs(args.cantidad) : Math.abs(args.cantidad);

        if (isOut && p.stock < Math.abs(args.cantidad)) {
            return { error: `Stock insuficiente. Disponible: ${p.stock}, intentas sacar: ${Math.abs(args.cantidad)}.` };
        }

        await db.query(`UPDATE products SET stock = stock + $1 WHERE id = $2::uuid`, [delta, p.id]);
        // Movement log (best-effort, table may have different fields)
        try {
            await db.query(`
                INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, description, user_id)
                VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::uuid)
            `, [tenantId, p.id, isOut ? 'damaged' : 'purchase', Math.abs(args.cantidad), args.motivo || (isOut ? 'Salida manual' : 'Entrada manual'), userId]);
        } catch { /* table optional */ }

        return {
            success: true,
            producto: p.name,
            stock_anterior: p.stock,
            stock_nuevo: p.stock + delta,
            mensaje: `Stock de "${p.name}" ${isOut ? 'reducido' : 'incrementado'} en ${Math.abs(args.cantidad)} unidades. Nuevo stock: ${p.stock + delta}.`,
        };
    },

    async ver_stock_bajo(args, { tenantId }) {
        const umbral = args.umbral ?? 5;
        const { rows } = await db.query(`
            SELECT id, name, stock, sale_price
            FROM products
            WHERE tenant_id = $1::uuid AND is_active = true AND stock <= $2
            ORDER BY stock ASC, name
        `, [tenantId, umbral]);
        return {
            umbral,
            total: rows.length,
            productos: rows,
        };
    },

    async productos_mas_vendidos(args, { tenantId }) {
        const days = getPeriodDays(args.periodo);
        const { rows } = await db.query(`
            SELECT ii.description AS producto,
                   SUM(ii.quantity) AS unidades_vendidas,
                   SUM(ii.total_price) AS ingresos
            FROM invoice_items ii
            JOIN invoices i ON ii.invoice_id = i.id
            WHERE ii.tenant_id = $1::uuid
              AND ii.item_type = 'product'
              AND i.created_at >= NOW() - INTERVAL '1 day' * $2::int
            GROUP BY ii.description
            ORDER BY unidades_vendidas DESC
            LIMIT 10
        `, [tenantId, days]);
        return { periodo: args.periodo || 'mes', ranking: rows };
    },

    async crear_categoria_producto(args, { tenantId }) {
        try {
            const { rows } = await db.query(`
                INSERT INTO product_categories (tenant_id, name, product_commission_percent)
                VALUES ($1::uuid, $2, $3)
                RETURNING id, name, product_commission_percent
            `, [tenantId, args.nombre, args.comision_default ?? null]);
            return { success: true, categoria: rows[0] };
        } catch (err) {
            if (err.code === '23505') return { error: `Ya existe una categoría llamada "${args.nombre}".` };
            throw err;
        }
    },

    async listar_categorias_producto(args, { tenantId }) {
        const { rows } = await db.query(`
            SELECT id, name, product_commission_percent
            FROM product_categories WHERE tenant_id = $1::uuid ORDER BY name
        `, [tenantId]);
        return { total: rows.length, categorias: rows };
    },
};

async function execute(fnName, args, ctx) {
    const fn = executors[fnName];
    if (!fn) return { error: `Función ${fnName} no implementada en inventario.` };
    try { return await fn(args, ctx); } catch (err) { console.error(`[inventario] ${fnName}:`, err); return { error: err.message }; }
}

module.exports = { name: 'inventario', tools, systemPrompt, executors, execute };
