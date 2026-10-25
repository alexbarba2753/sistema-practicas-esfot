import { aulaVirtualService } from '../../application/services/aulaVirtualService.js';

export const aulaVirtualController = {
  async crearAula(req, res, next) {
    try {
      const resultado = await aulaVirtualService.crearAulaVirtual(req.body);
      res.status(201).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async listarAulas(req, res, next) {
    try {
      const resultado = await aulaVirtualService.listarAulasVirtuales(req.query);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async obtenerAula(req, res, next) {
    try {
      const resultado = await aulaVirtualService.obtenerAulaVirtualPorId(req.params.id);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async actualizarAula(req, res, next) {
    try {
      const resultado = await aulaVirtualService.actualizarAulaVirtual(req.params.id, req.body);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async matricularEstudiantes(req, res, next) {
    try {
      const { estudiantes } = req.body;
      const resultado = await aulaVirtualService.matricularEstudiantes(req.params.id, estudiantes);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async desmatricularEstudiante(req, res, next) {
    try {
      const resultado = await aulaVirtualService.desmatricularEstudiante(
        req.params.id,
        req.params.estudianteId
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  }
};
