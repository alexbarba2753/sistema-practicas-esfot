import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../../domain/constants/practicasConstants.js';
import { docenteController } from '../controllers/docenteController.js';

const router = Router();

// Todas las rutas del docente requieren autenticación JWT y rol Docente
router.use(authMiddleware, requireRole(ROLES.DOCENTE));

// 1. HU-005: Aulas virtuales asignadas y seguimiento de progreso
router.get('/aulas', docenteController.listarAulas);
router.get('/aulas/:aulaId', docenteController.obtenerDetalleAula);

// 2. HU-006: Bitácoras laborales (listar y evaluar individualmente)
router.get('/aulas/:aulaId/laborales', docenteController.listarActividadesLaborales);
router.put('/actividades/laborales/:actividadId/evaluar', docenteController.evaluarActividadLaboral);

// 3. HU-007: Actividades comunitarias (listar y evaluar individualmente)
router.get('/aulas/:aulaId/comunitarias', docenteController.listarActividadesComunitarias);
router.put('/actividades/comunitarias/:actividadId/evaluar', docenteController.evaluarActividadComunitaria);

// 4. Revisión del borrador generado por IA y descarga de plantilla Excel
router.get('/aulas/:aulaId/formulario-pendiente', docenteController.obtenerFormularioPendiente);
router.get('/aulas/:aulaId/descargar-informe', docenteController.descargarInformeExcel);

// 5. HU-008: Evaluación final, cierre formal y acta de aprobación definitiva
router.post('/aulas/:aulaId/cerrar-practica', docenteController.cerrarPractica);

export default router;
