import { adminUsuariosService } from '../../application/services/adminUsuariosService.js';

export const adminUsuariosController = {
  async crearUsuario(req, res, next) {
    try {
      const resultado = await adminUsuariosService.crearUsuarioPorAdmin(req.body);
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async listarUsuarios(req, res, next) {
    try {
      const resultado = await adminUsuariosService.listarUsuarios(req.query);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async obtenerUsuario(req, res, next) {
    try {
      const resultado = await adminUsuariosService.obtenerUsuarioPorId(req.params.id);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async actualizarUsuario(req, res, next) {
    try {
      const resultado = await adminUsuariosService.actualizarUsuario(req.params.id, req.body);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async cambiarEstadoUsuario(req, res, next) {
    try {
      const { estado } = req.body;
      const resultado = await adminUsuariosService.cambiarEstadoUsuario(req.params.id, estado);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
};
