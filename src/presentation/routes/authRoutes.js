import { Router } from 'express';
import { authController } from '../controllers/authController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

// Rutas públicas
router.post('/registro', authController.registro);
router.post('/verificar-cuenta', authController.verificarCuenta);
router.post('/login', authController.login);
router.post('/recuperar-password', authController.solicitarRecuperacionPassword);
router.post('/restablecer-password', authController.restablecerPassword);

// Rutas protegidas con token JWT
router.get('/perfil', authMiddleware, authController.obtenerPerfil);
router.put('/perfil', authMiddleware, authController.actualizarPerfil);
router.put('/cambiar-password', authMiddleware, authController.cambiarPassword);
router.post('/logout', authMiddleware, authController.logout);

export default router;
