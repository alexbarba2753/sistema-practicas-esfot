import request from 'supertest';
import app from '../src/app.js';

describe('Sprint 0 - Smoke Tests', () => {
  it('GET /api/health debe responder 200 con status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('operativa');
  });

  it('GET /api/ruta-inexistente debe responder 404', async () => {
    const res = await request(app).get('/api/ruta-inexistente');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
