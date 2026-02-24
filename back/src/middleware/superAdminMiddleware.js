/**
 * Middleware: restrict access to super admin (role_id = 5) only.
 */
'use strict';

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role_id !== 5) {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de super administrador.' });
  }
  next();
}

module.exports = { requireSuperAdmin };
