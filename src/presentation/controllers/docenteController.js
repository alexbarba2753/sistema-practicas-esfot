import { expedienteService } from '../../application/services/expedienteService.js';
import { actividadService } from '../../application/services/actividadService.js';

export const docenteController = {
  async obtenerAulas(req, res, next) {
    try {
      const resultado = await expedienteService.obtenerAulasDocente(req.usuario._id);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async obtenerDetalleAula(req, res, next) {
    try {
      const resultado = await expedienteService.obtenerDetalleAulaDocente(
        req.params.aulaId,
        req.usuario._id
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async listarActividadesLaborales(req, res, next) {
    try {
      const resultado = await actividadService.listarActividadesLaborales(
        req.params.aulaId,
        req.usuario
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async evaluarActividadLaboral(req, res, next) {
    try {
      const resultado = await actividadService.evaluarActividadLaboral(
        req.params.id,
        req.usuario._id,
        req.body
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async listarActividadesComunitarias(req, res, next) {
    try {
      const resultado = await actividadService.listarActividadesComunitarias(
        req.params.aulaId,
        req.usuario
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async evaluarActividadComunitaria(req, res, next) {
    try {
      const resultado = await actividadService.evaluarActividadComunitaria(
        req.params.id,
        req.usuario._id,
        req.body
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async cerrarProceso(req, res, next) {
    try {
      const resultado = await expedienteService.cerrarProcesoDocente(
        req.params.aulaId,
        req.usuario._id,
        req.body
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
};
