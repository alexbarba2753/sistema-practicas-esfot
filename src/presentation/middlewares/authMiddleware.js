import jwt from 'jsonwebtoken';
import { ENV } from '../../infrastructure/config/env.js';
import { Usuario } from '../../infrastructure/database/models/index.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado: Token de autenticación no proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado: Token inválido o expirado'
      });
    }

    const usuario = await Usuario.findById(decoded.id);
    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado: El usuario asociado al token no existe'
      });
    }

    if (usuario.estado !== 'activo') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: Su cuenta no está activa'
      });
    }

    // Inyectar usuario en la petición
    req.usuario = usuario;
    next();
  } catch (error) {
    next(error);
  }
};
