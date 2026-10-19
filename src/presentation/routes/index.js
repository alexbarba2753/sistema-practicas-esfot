import { Router } from 'express';

const router = Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API del Sistema de Prácticas ESFOT operativa (Arquitectura Hexagonal / Clean)',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

export default router;
