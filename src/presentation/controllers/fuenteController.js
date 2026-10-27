import { fuenteService } from '../../application/services/fuenteService.js';

export const fuenteController = {
  async ingestarFuente(req, res, next) {
    try {
      const resultado = await fuenteService.ingestarFuente(req.body, req.usuario._id);
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async listarFuentes(req, res, next) {
    try {
      const resultado = await fuenteService.listarFuentes(req.query);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async obtenerFuente(req, res, next) {
    try {
      const resultado = await fuenteService.obtenerFuentePorId(req.params.id);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async actualizarFuente(req, res, next) {
    try {
      const resultado = await fuenteService.actualizarFuente(req.params.id, req.body);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async cambiarEstadoFuente(req, res, next) {
    try {
      const { activo } = req.body;
      const resultado = await fuenteService.cambiarEstadoFuente(req.params.id, activo);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async eliminarFuente(req, res, next) {
    try {
      const resultado = await fuenteService.eliminarFuente(req.params.id);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
};
