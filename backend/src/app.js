const express = require('express');
const { notFoundHandler, errorHandler } = require('./shared/error.handler');
const { assertConnection } = require('./shared/database');

const app = express();


// middleware
app.use(express.json());

// Deployment health checks 
app.get('/healthz', (req, res) => {
	res.status(200).json({
		status: 'ok',
		uptime: process.uptime(),
		timestamp: new Date().toISOString()
	});
});

app.get('/readyz', async (req, res) => {
	try {
		await assertConnection();
		res.status(200).json({ status: 'ready', database: 'connected' });
	} catch {
		res.status(503).json({ status: 'degraded', database: 'disconnected' });
	}
});

const authRoutes = require('./modules/auth/auth.routes');
app.set('trust proxy', 1);
app.use(express.json({ limit: '100kb' }));

app.use('/api/auth', authRoutes);

app.use(notFoundHandler);
app.use(errorHandler);



module.exports = app;

