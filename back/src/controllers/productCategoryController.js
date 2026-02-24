// src/controllers/productCategoryController.js
const prisma = require('../config/prisma');

/**
 * Obtiene todas las categorías de producto de un tenant.
 */
exports.getAllCategories = async (req, res) => {
    const { tenant_id } = req.user;
    try {
        const categories = await prisma.product_categories.findMany({
            where: { tenant_id },
            orderBy: { name: 'asc' },
        });
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error al obtener las categorías de producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/**
 * Crea una nueva categoría de producto.
 */
exports.createCategory = async (req, res) => {
    const { name } = req.body;
    const { tenant_id } = req.user;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'El campo "name" es obligatorio.' });
    }

    try {
        const category = await prisma.product_categories.create({
            data: { tenant_id, name: name.trim() },
        });
        res.status(201).json(category);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Ya existe una categoría de producto con ese nombre.' });
        }
        console.error('Error al crear la categoría de producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/**
 * Actualiza una categoría de producto existente.
 */
exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const { tenant_id } = req.user;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'El campo "name" es obligatorio.' });
    }

    try {
        const existing = await prisma.product_categories.findFirst({
            where: { id, tenant_id },
        });

        if (!existing) {
            return res.status(404).json({ message: 'Categoría no encontrada o no pertenece a tu negocio.' });
        }

        const category = await prisma.product_categories.update({
            where: { id },
            data: { name: name.trim(), updated_at: new Date() },
        });
        res.status(200).json(category);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Ya existe otra categoría con ese nombre.' });
        }
        console.error('Error al actualizar la categoría de producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

/**
 * Elimina una categoría de producto.
 */
exports.deleteCategory = async (req, res) => {
    const { id } = req.params;
    const { tenant_id } = req.user;

    try {
        const existing = await prisma.product_categories.findFirst({
            where: { id, tenant_id },
        });

        if (!existing) {
            return res.status(404).json({ message: 'Categoría no encontrada o no pertenece a tu negocio.' });
        }

        await prisma.product_categories.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(409).json({ error: 'No se puede eliminar la categoría porque está siendo usada por uno o más productos.' });
        }
        console.error('Error al eliminar la categoría de producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
