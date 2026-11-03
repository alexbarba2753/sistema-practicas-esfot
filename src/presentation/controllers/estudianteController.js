import { expedienteService } from '../../application/services/expedienteService.js';
import { actividadService } from '../../application/services/actividadService.js';
import { asistenteIaService } from '../../application/services/asistenteIaService.js';

export const estudianteController = {
  async obtenerAulas(req, res, next) {
    try {
      const resultado = await expedienteService.obtenerAulasEstudiante(req.usuario._id);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async consultarAsistenteIa(req, res, next) {
    try {
      const { pregunta } = req.body;
      const resultado = await asistenteIaService.consultarNormativa(pregunta);
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async crearActividadLaboral(req, res, next) {
    try {
      const resultado = await actividadService.crearActividadLaboral(
        req.usuario._id,
        req.params.aulaId,
        req.body
      );
      res.status(201).json(resultado);
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

  async generarReporteLaboralIA(req, res, next) {
    try {
      const resultado = await asistenteIaService.generarReporteLaboralIA(
        req.params.aulaId,
        req.usuario._id
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async crearActividadComunitaria(req, res, next) {
    try {
      const resultado = await actividadService.crearActividadComunitaria(
        req.usuario._id,
        req.params.aulaId,
        req.body
      );
      res.status(201).json(resultado);
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

  async generarReporteComunitarioIA(req, res, next) {
    try {
      const resultado = await asistenteIaService.generarReporteComunitarioIA(
        req.params.aulaId,
        req.usuario._id
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async entregarExpediente(req, res, next) {
    try {
      const resultado = await expedienteService.entregarExpediente(
        req.params.aulaId,
        req.usuario._id
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async obtenerFormularioPendiente(req, res, next) {
    try {
      const resultado = await expedienteService.obtenerFormularioPendiente(
        req.params.aulaId,
        req.usuario._id
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async actualizarFormularioPendiente(req, res, next) {
    try {
      const resultado = await expedienteService.actualizarFormularioPendiente(
        req.params.aulaId,
        req.usuario._id,
        req.body
      );
      res.status(200).json(resultado);
    } catch (error) {
      next(error);
    }
  },

  async descargarInformeLaboralExcel(req, res, next) {
    try {
      const { buffer, filename } = await expedienteService.descargarInformeExcel(
        req.params.aulaId,
        req.usuario._id,
        'laboral'
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  },

  async descargarInformeComunitarioExcel(req, res, next) {
    try {
      const { buffer, filename } = await expedienteService.descargarInformeExcel(
        req.params.aulaId,
        req.usuario._id,
        'comunitario'
      );
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(buffer);
    } catch (error) {
      next(error);
    }
  }
};
