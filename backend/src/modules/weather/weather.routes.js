const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const { weatherLimiter } = require('../../shared/rate.limit');
const schemas = require('./weather.schemas');
const controller = require('./weather.controller');

const router = express.Router();

router.use(authenticate, weatherLimiter);

router.get('/current', validate(schemas.current, 'query'), controller.current);
router.get(
	'/forecast',
	validate(schemas.forecast, 'query'),
	controller.forecast
);

module.exports = router;
