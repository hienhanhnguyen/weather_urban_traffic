const express = require('express');
const cors = require('cors');
const config = require('./shared/config');
const { notFoundHandler, errorHandler } = require('./shared/error.handler');
const { ForbiddenError } = require('./shared/errors');
const { assertConnection } = require('./shared/database');

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/users.routes');
const locationRoutes = require('./modules/locations/locations.routes');
const weatherRoutes = require('./modules/weather/weather.routes');
const alertRoutes = require('./modules/alerts/alerts.routes');
const geoRoutes = require('./modules/geo/geo.routes');
const routingRoutes = require('./modules/routing/routing.routes');
const businessRoutes = require('./modules/business/business.routes');
const analysisRoutes = require('./modules/analysis/analysis.routes');
const requestId = require('./shared/request.id');


const app = express();

// settings
app.set('trust proxy', 1);
app.use(requestId);

// middleware
app.use(
	cors({
		origin(origin, callback) {
			if (!origin || config.http.allowedOrigins.includes(origin)) {
				return callback(null, true);
			}
			callback(new ForbiddenError('Origin not allowed', {
				code: 'ORIGIN_NOT_ALLOWED',
			}));
		},
		credentials: false,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		maxAge: 86_400,
	})
);

app.use(express.json({ limit: '100kb' }));

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

// routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/geo', geoRoutes);
app.use('/api/routes', routingRoutes.routes);
app.use('/api/history', routingRoutes.history);
app.use('/api/business', businessRoutes);
app.use('/api/analysis', analysisRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

