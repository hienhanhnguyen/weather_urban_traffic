const express = require('express');
const { notFoundHandler, errorHandler } = require('./shared/error.handler');

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

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

