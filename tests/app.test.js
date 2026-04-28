const request = require('supertest');
const app = require('../server');

describe('Backend health check', () => {
  it('returns healthy status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });
});
