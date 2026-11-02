import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../../domain/constants/practicasConstants.js';
import { docenteController } from '../controllers/docenteController.js';

const router = Router();

// Todas las rutas de docente requieren autenticación JWT y rol Docente
router.use(authMiddleware, requireRole(ROLES.DOCENTE));

// 1. Consulta y acceso al aula virtual docente asignada
router.get('/aulas', docenteController.obtenerAulas);
router.get('/aulas/:aulaId', docenteController.obtenerDetalleAula);

// 2. Revisión y validación de bitácoras de prácticas laborales
router.get('/aulas/:aulaId/laborales', docenteController.listarActividadesLaborales);
router.patch('/laborales/:id/evaluar', docenteController.evaluarActividadLaboral);

// 3. Supervisión y control de horas de servicio comunitario
router.get('/aulas/:aulaId/comunitarias', docenteController.listarActividadesComunitarias);
router.patch('/comunitarias/:id/evaluar', docenteController.evaluarActividadComunitaria);

// 4. Cierre formal y emisión de formularios de aprobación
router.post('/aulas/:aulaId/cerrar-proceso', docenteController.cerrarProceso);

export default router;
