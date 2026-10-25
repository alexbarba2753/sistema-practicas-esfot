/**
 * Middleware para autorización basada en roles (RBAC).
 * Verifica que el usuario autenticado (inyectado por authMiddleware) posea uno de los roles autorizados.
 */
export const requireRole = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado: Sesión de usuario no encontrada'
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: No tiene los permisos necesarios para realizar esta acción'
      });
    }

    next();
  };
};
