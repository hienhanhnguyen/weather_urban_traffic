const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const authorize = require('../../shared/authorize');
const { reportEmailLimiter } = require('../../shared/rate.limit');
const schemas = require('./govreports.schemas');
const controller = require('./govreports.controller');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', validate(schemas.report, 'query'), controller.getReport);

router.post(
	'/email',
	reportEmailLimiter,
	validate(schemas.emailReport),
	controller.emailReport
);

router.get('/schedule', controller.getSchedule);
router.put(
	'/schedule',
	validate(schemas.saveSchedule),
	controller.saveSchedule
);
router.delete('/schedule', controller.removeSchedule);

module.exports = router;
