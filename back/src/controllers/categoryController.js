// src/controllers/categoryController.js
const prisma = require('../config/prisma');

// Crear una nueva Categoría de Servicio
exports.createCategory = async (req, res) => {
    const { name } = req.body;
    const { tenant_id } = req.user;
    try {
        const category = await prisma.service_categories.create({
            data: { tenant_id, name },
        });
        res.status(201).json(category);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Ya existe una categoría con ese nombre.' });
        }
        console.error('Error al crear la categoría:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Obtener todas las categorías de un Tenant
exports.getCategoriesByTenant = async (req, res) => {
    const { tenant_id } = req.user;
    try {
        const categories = await prisma.service_categories.findMany({
            where: { tenant_id },
            orderBy: { name: 'asc' },
        });
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Actualizar una Categoría
exports.updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const category = await prisma.service_categories.update({
            where: { id },
            data: { name, updated_at: new Date() },
        });
        res.status(200).json(category);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Categoría no encontrada.' });
        }
        console.error('Error al actualizar la categoría:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// Eliminar una Categoría
exports.deleteCategory = async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.service_categories.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error('Error al eliminar la categoría:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
