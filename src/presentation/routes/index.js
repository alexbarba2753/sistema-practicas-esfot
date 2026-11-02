import { Router } from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';
import docenteRoutes from './docenteRoutes.js';
import estudianteRoutes from './estudianteRoutes.js';

const router = Router();

// Sprint 1: Módulo de Cuentas, Autenticación y Perfil
router.use('/auth', authRoutes);

// Sprint 2: Módulo de Administración (Cuentas, Aulas Virtuales, Fuentes IA)
router.use('/admin', adminRoutes);

// Sprint 3: Módulo de Docente Tutor (Aulas, Bitácoras, Supervisión y Cierre)
router.use('/docente', docenteRoutes);

// Sprint 4: Módulo de Estudiante (Aulas, Asistente RAG, Bitácoras, Reportes IA y Entrega)
router.use('/estudiante', estudianteRoutes);

export default router;
