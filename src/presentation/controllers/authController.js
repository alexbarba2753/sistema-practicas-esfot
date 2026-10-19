import { authService } from '../../application/services/authService.js';

export const authController = {
  async registro(req, res, next) {
    try {
      const resultado = await authService.registrarEstudiante(req.body);
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async verificarCuenta(req, res, next) {
    try {
      const resultado = await authService.verificarCuenta(req.body.token);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async login(req, res, next) {
    try {
      const { correo, password } = req.body;
      const resultado = await authService.login(correo, password);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async obtenerPerfil(req, res, next) {
    try {
      const resultado = await authService.obtenerPerfil(req.usuario._id);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async actualizarPerfil(req, res, next) {
    try {
      const resultado = await authService.actualizarPerfil(req.usuario._id, req.body);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async cambiarPassword(req, res, next) {
    try {
      const { passwordActual, passwordNueva } = req.body;
      const resultado = await authService.cambiarPassword(
        req.usuario._id,
        passwordActual,
        passwordNueva
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async solicitarRecuperacionPassword(req, res, next) {
    try {
      const { correo } = req.body;
      const resultado = await authService.solicitarRecuperacionPassword(correo);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async restablecerPassword(req, res, next) {
    try {
      const { token, passwordNueva } = req.body;
      const resultado = await authService.restablecerPassword(token, passwordNueva);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async logout(req, res) {
    res.status(200).json({
      success: true,
      message: 'Sesión finalizada exitosamente'
    });
  }
};
