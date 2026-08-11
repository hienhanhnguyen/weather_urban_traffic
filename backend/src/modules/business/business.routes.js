const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const requireAccountType = require('../../shared/require.account.type');
const schemas = require('./business.schemas');
const controller = require('./business.controller');

const router = express.Router();

router.use(authenticate);
router.use(requireAccountType('business'));

router.get('/report', validate(schemas.report, 'query'), controller.getReport);

router.get('/report-schedule', controller.getSchedule);
router.put(
	'/report-schedule',
	validate(schemas.saveSchedule),
	controller.saveSchedule
);
router.delete('/report-schedule', controller.removeSchedule);

module.exports = router;
