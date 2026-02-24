// =========================================================
// File: src/controllers/productController.js
// =========================================================
const prisma = require('../config/prisma');

// --- Helper: valida/normaliza porcentaje (0–100) o null ---
function parsePercentOrNull(input, fieldName = 'product_commission_percent') {
  if (input === undefined || input === null || input === '') return null;
  const n = Number(input);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    const err = new Error(`${fieldName} debe estar entre 0 y 100.`);
    err.status = 400;
    throw err;
  }
  return Math.round(n * 100) / 100;
}

/**
 * Crea un nuevo producto.
 */
exports.createProduct = async (req, res) => {
  const {
    name,
    description,
    cost_price,
    sale_price,
    staff_price,
    stock = 0,
    category_id,
    audience_type = 'ambos',
    product_commission_percent,
  } = req.body;
  const { tenant_id } = req.user;

  if (!name || sale_price === undefined) {
    return res.status(400).json({ error: 'Campos obligatorios: name, sale_price.' });
  }

  let pct = null;
  try {
    pct = parsePercentOrNull(product_commission_percent);
  } catch (e) {
    return res.status(e.status || 400).json({ error: e.message });
  }

  try {
    const product = await prisma.products.create({
      data: {
        tenant_id,
        name,
        description,
        cost_price,
        sale_price,
        staff_price,
        stock,
        category_id,
        audience_type,
        product_commission_percent: pct,
      },
    });
    res.status(201).json(product);
  } catch (error) {
    console.error('Error al crear el producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene todos los productos activos de un tenant, con filtros opcionales.
 */
exports.getProductsByTenant = async (req, res) => {
  const { tenant_id } = req.user;
  const { audience } = req.query;

  try {
    const where = { tenant_id, is_active: true };

    if (audience === 'cliente') {
      where.audience_type = { in: ['cliente', 'ambos'] };
    } else if (audience === 'estilista') {
      where.audience_type = { in: ['estilista', 'ambos'] };
    }

    const products = await prisma.products.findMany({
      where,
      include: {
        product_categories: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const result = products.map((p) => ({
      ...p,
      category_name: p.product_categories?.name ?? null,
      product_categories: undefined,
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Obtiene un producto específico por su ID.
 */
exports.getProductById = async (req, res) => {
  const { id } = req.params;
  const { tenant_id } = req.user;
  try {
    const product = await prisma.products.findFirst({
      where: { id, tenant_id, is_active: true },
      include: {
        product_categories: { select: { name: true } },
      },
    });
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    const result = {
      ...product,
      category_name: product.product_categories?.name ?? null,
      product_categories: undefined,
    };
    res.status(200).json(result);
  } catch (error) {
    console.error('Error al obtener el producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Actualiza un producto existente.
 */
exports.updateProduct = async (req, res) => {
  const { id } = req.params;
  const { tenant_id } = req.user;

  const {
    name,
    description,
    cost_price,
    sale_price,
    staff_price,
    stock,
    category_id,
    audience_type,
    product_commission_percent,
  } = req.body;

  try {
    const current = await prisma.products.findFirst({
      where: { id, tenant_id },
    });
    if (!current) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    let pct = undefined;
    try {
      if (product_commission_percent !== undefined) {
        pct = parsePercentOrNull(product_commission_percent);
      }
    } catch (e) {
      return res.status(e.status || 400).json({ error: e.message });
    }

    const product = await prisma.products.update({
      where: { id },
      data: {
        name: name ?? current.name,
        description: description ?? current.description,
        cost_price: cost_price ?? current.cost_price,
        sale_price: sale_price ?? current.sale_price,
        staff_price: staff_price ?? current.staff_price,
        stock: stock ?? current.stock,
        category_id: category_id ?? current.category_id,
        audience_type: audience_type ?? current.audience_type,
        product_commission_percent: pct === undefined ? current.product_commission_percent : pct,
        updated_at: new Date(),
      },
    });

    res.status(200).json(product);
  } catch (error) {
    console.error('Error al actualizar el producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Elimina un producto (Borrado Lógico).
 */
exports.deleteProduct = async (req, res) => {
  const { id } = req.params;
  const { tenant_id } = req.user;
  try {
    const existing = await prisma.products.findFirst({
      where: { id, tenant_id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    await prisma.products.update({
      where: { id },
      data: { is_active: false, updated_at: new Date() },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar el producto:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * Permite ajustar el stock manualmente (compras, ajustes, etc.)
 */
exports.manageStock = async (req, res) => {
  const { productId } = req.params;
  const { type, quantity, description } = req.body;
  const { tenant_id } = req.user;

  const qty = parseInt(quantity, 10);
  if (isNaN(qty)) return res.status(400).json({ error: 'La cantidad debe ser un número.' });

  try {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.products.findFirst({
        where: { id: productId, tenant_id },
      });
      if (!product) throw new Error('Producto no encontrado.');

      let newStock;
      if (type === 'purchase' || type === 'adjustment-in') {
        newStock = product.stock + Math.abs(qty);
      } else if (type === 'sale' || type === 'adjustment-out' || type === 'damaged') {
        if (product.stock < Math.abs(qty)) throw new Error('Stock insuficiente o producto no encontrado.');
        newStock = product.stock - Math.abs(qty);
      } else {
        throw new Error('Tipo de movimiento no válido.');
      }

      await tx.products.update({
        where: { id: productId },
        data: { stock: newStock, updated_at: new Date() },
      });

      await tx.inventory_movements.create({
        data: {
          tenant_id,
          product_id: productId,
          type,
          quantity: qty,
        },
      });

      return newStock;
    });

    res.status(200).json({ message: 'Stock actualizado con éxito', newStock: result });
  } catch (error) {
    console.error('Error al gestionar el stock:', error.message);
    res.status(500).json({ error: `Error interno del servidor: ${error.message}` });
  }
};

/**
 * Actualiza la URL de la imagen de un producto después de que Multer la haya subido.
 */
exports.uploadProductImage = async (req, res) => {
  const { productId } = req.params;
  const { tenant_id } = req.user;

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo de imagen.' });
  }

  const imageUrl = `/uploads/products/${req.file.filename}`;

  try {
    const existing = await prisma.products.findFirst({
      where: { id: productId, tenant_id },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Producto no encontrado o no pertenece a tu negocio.' });
    }

    const product = await prisma.products.update({
      where: { id: productId },
      data: { image_url: imageUrl, updated_at: new Date() },
    });

    res.status(200).json(product);
  } catch (error) {
    console.error('Error al guardar la URL de la imagen del producto:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};
