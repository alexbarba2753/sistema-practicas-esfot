import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { requireRole } from '../middlewares/roleMiddleware.js';
import { ROLES } from '../../domain/constants/practicasConstants.js';
import { adminUsuariosController } from '../controllers/adminUsuariosController.js';
import { aulaVirtualController } from '../controllers/aulaVirtualController.js';
import { fuenteController } from '../controllers/fuenteController.js';

const router = Router();

// Todas las rutas de administración requieren autenticación JWT y rol Administrador
router.use(authMiddleware, requireRole(ROLES.ADMINISTRADOR));

// 1. Administración de Cuentas (Docentes y Estudiantes)

router.post('/usuarios', adminUsuariosController.crearUsuario);
router.get('/usuarios', adminUsuariosController.listarUsuarios);
router.get('/usuarios/:id', adminUsuariosController.obtenerUsuario);
router.put('/usuarios/:id', adminUsuariosController.actualizarUsuario);
router.patch('/usuarios/:id/estado', adminUsuariosController.cambiarEstadoUsuario);

//  2. Creación y Parametrización de Aulas Virtuales

router.post('/aulas-virtuales', aulaVirtualController.crearAula);
router.get('/aulas-virtuales', aulaVirtualController.listarAulas);
router.get('/aulas-virtuales/:id', aulaVirtualController.obtenerAula);
router.put('/aulas-virtuales/:id', aulaVirtualController.actualizarAula);
router.post('/aulas-virtuales/:id/estudiantes', aulaVirtualController.matricularEstudiantes);
router.delete('/aulas-virtuales/:id/estudiantes/:estudianteId', aulaVirtualController.desmatricularEstudiante);

// 3. Ingesta y Gestión de Fuentes Institucionales para la IA (RAG)

router.post('/fuentes', fuenteController.ingestarFuente);
router.get('/fuentes', fuenteController.listarFuentes);
router.get('/fuentes/:id', fuenteController.obtenerFuente);
router.put('/fuentes/:id', fuenteController.actualizarFuente);
router.patch('/fuentes/:id/estado', fuenteController.cambiarEstadoFuente);
router.delete('/fuentes/:id', fuenteController.eliminarFuente);

export default router;
