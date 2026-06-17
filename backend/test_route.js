// Reproduce the login route logic
const express = require('express');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

// Simulate the authLimiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many authentication attempts" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    const { z } = require('zod');
    
    const loginSchema = z.object({
      email: z.string().email().max(255),
      password: z.string().min(1).max(128),
    });
    
    const prisma = new PrismaClient();
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: true } } }
    });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { userId: user.id, role: user.role.name },
      '12m-crm-jwt-secret-2024',
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: {
        id: user.id, email: user.email,
        firstName: user.firstName, lastName: user.lastName,
        role: { name: user.role.name, permissions: user.role.permissions || [] },
        permissions: (user.role.permissions || []).map(p => p.permission),
      },
    });
    await prisma.$disconnect();
  } catch (e) {
    console.error('Route error:', e.message, e.stack);
    if (e.issues) return res.status(400).json({ error: 'Validation failed', details: e.issues });
    res.status(e.statusCode || 500).json({ error: e.message || 'Login failed' });
  }
});

app.listen(3001, () => {
  console.log('Test server on 3001');
  // Make a test request
  const http = require('http');
  const data = JSON.stringify({ email: 'director@12m.ru', password: 'admin123' });
  const req = http.request({
    hostname: '127.0.0.1', port: 3001,
    path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', body);
      process.exit(0);
    });
  });
  req.write(data);
  req.end();
});
