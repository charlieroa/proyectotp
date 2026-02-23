// =========================================================
// File: src/controllers/staffPurchaseController.js
// (Tu versión, fusionada con la lógica de seller_user_id)
// Migrated from raw pg to Prisma ORM
// =========================================================
const prisma = require('../config/prisma');

exports.createPurchase = async (req, res) => {
    // <-- CAMBIO 1: Capturamos el ID del usuario logueado (el vendedor) del token.
    const { tenant_id, id: seller_user_id } = req.user;
    const { stylist_id, items, purchase_date, payment_terms_weeks } = req.body;

    if (!stylist_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Se requiere stylist_id y una lista no vacía de items.' });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // Validate stylist belongs to tenant
            const stylist = await tx.users.findFirst({
                where: { id: stylist_id, tenant_id, role_id: 3 },
                select: { id: true },
            });
            if (!stylist) { throw new Error('El estilista no existe o no pertenece a tu negocio.'); }

            let totalAmount = 0;
            const normalized = [];
            for (const it of items) {
                const { product_id, quantity } = it || {};
                const qty = Number(quantity);
                if (!product_id || !Number.isFinite(qty) || qty <= 0) { throw new Error('Cada item debe tener product_id y quantity > 0.'); }

                const prod = await tx.products.findFirst({
                    where: { id: product_id, tenant_id },
                    select: { id: true, sale_price: true, staff_price: true, stock: true },
                });
                if (!prod) { throw new Error('Producto no encontrado o no pertenece a tu negocio.'); }

                const rawPrice = it.price_at_sale != null && it.price_at_sale !== ''
                    ? Number(it.price_at_sale)
                    : (prod.staff_price != null ? Number(prod.staff_price) : Number(prod.sale_price));
                if (!Number.isFinite(rawPrice) || rawPrice < 0) { throw new Error('price_at_sale inválido para algún producto.'); }

                totalAmount += rawPrice * qty;
                normalized.push({ product_id, quantity: qty, price_at_sale: rawPrice });
            }
            if (totalAmount <= 0) { throw new Error('El total de la compra debe ser mayor que cero.'); }

            // <-- CAMBIO 2: Añadimos seller_user_id a la creación.
            const purchase = await tx.staff_purchases.create({
                data: {
                    tenant_id,
                    stylist_id,
                    seller_user_id,
                    total_amount: totalAmount,
                    purchase_date: purchase_date ? new Date(purchase_date) : new Date(),
                    payment_terms_weeks: payment_terms_weeks || 1,
                },
            });

            // Insert items and deduct stock
            for (const row of normalized) {
                // Deduct stock with a check (stock >= quantity)
                const updated = await tx.products.updateMany({
                    where: {
                        id: row.product_id,
                        tenant_id,
                        stock: { gte: row.quantity },
                    },
                    data: {
                        stock: { decrement: row.quantity },
                        updated_at: new Date(),
                    },
                });
                if (updated.count === 0) { throw new Error('Stock insuficiente en uno de los productos.'); }

                await tx.staff_purchase_items.create({
                    data: {
                        purchase_id: purchase.id,
                        product_id: row.product_id,
                        quantity: row.quantity,
                        price_at_sale: row.price_at_sale,
                    },
                });
            }

            return { purchaseId: purchase.id, totalAmount };
        });

        return res.status(201).json({
            success: true,
            message: 'Compra registrada con éxito.',
            purchaseId: result.purchaseId,
            total_amount: result.totalAmount,
        });
    } catch (err) {
        console.error('Error al registrar compra de personal:', err);
        return res.status(400).json({ error: err.message || 'Error interno del servidor' });
    }
};

// --- El resto de tus funciones no necesitan cambios ---

exports.getPurchasesByStylist = async (req, res) => {
    const { tenant_id } = req.user;
    const { stylistId } = req.params;
    try {
        const stylist = await prisma.users.findFirst({
            where: { id: stylistId, tenant_id, role_id: 3 },
            select: { id: true },
        });
        if (!stylist) { return res.status(404).json({ error: 'Estilista no encontrado en tu negocio.' }); }

        const rows = await prisma.$queryRawUnsafe(
            `SELECT sp.*,
                    (SELECT COALESCE(SUM(quantity),0) FROM staff_purchase_items spi WHERE spi.purchase_id = sp.id) AS total_units
             FROM staff_purchases sp
             WHERE sp.stylist_id = $1::uuid AND sp.tenant_id = $2::uuid
             ORDER BY sp.purchase_date DESC`,
            stylistId,
            tenant_id
        );
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener las compras del estilista:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.getPurchaseWithItems = async (req, res) => {
    const { tenant_id } = req.user;
    const { purchaseId } = req.params;
    try {
        const purchase = await prisma.staff_purchases.findFirst({
            where: { id: purchaseId, tenant_id },
            include: {
                users_staff_purchases_stylist_idTousers: {
                    select: { first_name: true, last_name: true },
                },
            },
        });
        if (!purchase) { return res.status(404).json({ error: 'Compra no encontrada.' }); }

        const items = await prisma.staff_purchase_items.findMany({
            where: { purchase_id: purchaseId },
            include: {
                products: { select: { name: true } },
            },
        });

        // Flatten to match original response shape
        const { users_staff_purchases_stylist_idTousers, ...purchaseData } = purchase;
        const head = {
            ...purchaseData,
            first_name: users_staff_purchases_stylist_idTousers?.first_name || null,
            last_name: users_staff_purchases_stylist_idTousers?.last_name || null,
        };

        const flatItems = items.map(({ products, ...item }) => ({
            ...item,
            product_name: products?.name || null,
        }));

        res.status(200).json({ purchase: head, items: flatItems });
    } catch (error) {
        console.error('Error al obtener detalle de compra:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.updatePurchaseStatus = async (req, res) => {
    const { tenant_id } = req.user;
    const { purchaseId } = req.params;
    const { status } = req.body;
    const valid = ['pendiente', 'deducido', 'parcial'];
    if (!valid.includes(String(status))) { return res.status(400).json({ error: "Estado inválido. Use 'pendiente', 'deducido' o 'parcial'." }); }
    try {
        // Use findFirst + update to get the RETURNING-like behaviour
        const existing = await prisma.staff_purchases.findFirst({
            where: { id: purchaseId, tenant_id },
        });
        if (!existing) { return res.status(404).json({ message: 'Compra no encontrada.' }); }

        const updated = await prisma.staff_purchases.update({
            where: { id: purchaseId },
            data: { status, updated_at: new Date() },
        });
        res.status(200).json(updated);
    } catch (error) {
        console.error('Error al actualizar el estado de la compra:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
