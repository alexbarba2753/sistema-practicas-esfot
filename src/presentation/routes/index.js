import { Router } from 'express';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

// Sprint 1: Módulo de Cuentas, Autenticación y Perfil
router.use('/auth', authRoutes);

// Sprint 2: Módulo de Administración (Cuentas, Aulas Virtuales, Fuentes IA)
router.use('/admin', adminRoutes);

// Sprint 3: router.use('/docente', docenteRoutes);
// Sprint 4: router.use('/estudiante', estudianteRoutes);

export default router;
