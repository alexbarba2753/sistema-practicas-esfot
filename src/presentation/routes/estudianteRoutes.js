import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../../domain/constants/practicasConstants.js';
import { estudianteController } from '../controllers/estudianteController.js';

const router = Router();

// Todas las rutas de estudiante requieren autenticación JWT y rol Estudiante
router.use(authMiddleware, requireRole(ROLES.ESTUDIANTE));

// 1. Acceso y visualización del aula virtual para el estudiante
router.get('/aulas', estudianteController.obtenerAulas);

// 2. Interacción con el asistente inteligente para consultas institucionales (RAG)
router.post('/ia/consulta', estudianteController.consultarAsistenteIa);

// 3. Bitácora y registro de actividades de prácticas laborales
router.post('/aulas/:aulaId/laborales', estudianteController.crearActividadLaboral);
router.get('/aulas/:aulaId/laborales', estudianteController.listarActividadesLaborales);

// 4. Elaboración asistida por IA del reporte de prácticas laborales y gestión de borrador
router.post('/aulas/:aulaId/ia/reporte-laboral', estudianteController.generarReporteLaboralIA);
router.get('/aulas/:aulaId/formulario-pendiente', estudianteController.obtenerFormularioPendiente);
router.put('/aulas/:aulaId/formulario-pendiente', estudianteController.actualizarFormularioPendiente);
router.get('/aulas/:aulaId/descargar-informe-laboral', estudianteController.descargarInformeLaboralExcel);

// 5. Registro y justificación de horas en servicio comunitario
router.post('/aulas/:aulaId/comunitarias', estudianteController.crearActividadComunitaria);
router.get('/aulas/:aulaId/comunitarias', estudianteController.listarActividadesComunitarias);

// 6. Redacción del informe de servicio comunitario asistida por IA y descarga
router.post('/aulas/:aulaId/ia/reporte-comunitario', estudianteController.generarReporteComunitarioIA);
router.get('/aulas/:aulaId/descargar-informe-comunitario', estudianteController.descargarInformeComunitarioExcel);

// 7. Envío formal de expedientes para revisión y aprobación
router.post('/aulas/:aulaId/entregar-expediente', estudianteController.entregarExpediente);

export default router;
