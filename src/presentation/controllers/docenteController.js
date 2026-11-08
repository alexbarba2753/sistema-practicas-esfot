import { expedienteService } from '../../application/services/expedienteService.js';
import { actividadService } from '../../application/services/actividadService.js';

export const docenteController = {
  /**
   * HU-005: Listar aulas virtuales asignadas al docente tutor con cálculo de progreso
   */
  async listarAulas(req, res, next) {
    try {
      const resultado = await expedienteService.obtenerAulasDocente(req.usuario._id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  /**
   * HU-005: Detalle del aula virtual y estudiante asignado
   */
  async obtenerDetalleAula(req, res, next) {
    try {
      const { aulaId } = req.params;
      const resultado = await expedienteService.obtenerDetalleAulaDocente(aulaId, req.usuario._id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  /**
   * HU-006: Consultar bitácoras laborales del estudiante
   */
  async listarActividadesLaborales(req, res, next) {
    try {
      const { aulaId } = req.params;
      const resultado = await actividadService.listarActividadesLaborales(aulaId, req.usuario);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  /**
   * HU-006: Evaluar bitácora laboral individual (aprobar/rechazar con retroalimentación)
   */
  async evaluarActividadLaboral(req, res, next) {
    try {
      const { actividadId } = req.params;
      const resultado = await actividadService.evaluarActividadLaboral(actividadId, req.usuario._id, req.body);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  /**
   * HU-007: Consultar actividades comunitarias del estudiante
   */
  async listarActividadesComunitarias(req, res, next) {
    try {
      const { aulaId } = req.params;
      const resultado = await actividadService.listarActividadesComunitarias(aulaId, req.usuario);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  /**
   * HU-007: Evaluar actividad comunitaria individual (aprobar/rechazar con retroalimentación)
   */
  async evaluarActividadComunitaria(req, res, next) {
    try {
      const { actividadId } = req.params;
      const resultado = await actividadService.evaluarActividadComunitaria(actividadId, req.usuario._id, req.body);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Consultar borrador en formulario pendiente
   */
  async obtenerFormularioPendiente(req, res, next) {
    try {
      const { aulaId } = req.params;
      const resultado = await expedienteService.obtenerFormularioPendiente(aulaId, req.usuario._id);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Descargar informe oficial en Excel para revisión docente
   */
  async descargarInformeExcel(req, res, next) {
    try {
      const { aulaId } = req.params;
      const { buffer, filename } = await expedienteService.descargarInformeExcel(aulaId, req.usuario._id);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.status(200).send(buffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * HU-008: Evaluación final, cierre formal y acta de aprobación
   */
  async cerrarPractica(req, res, next) {
    try {
      const { aulaId } = req.params;
      const resultado = await expedienteService.cerrarProcesoDocente(aulaId, req.usuario._id, req.body);
      res.json(resultado);
    } catch (err) {
      next(err);
    }
  }
};
