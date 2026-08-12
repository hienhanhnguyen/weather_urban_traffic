const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const authorize = require('../../shared/authorize');
const schemas = require('./incidents.schemas');
const controller = require('./incidents.controller');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/summary', validate(schemas.summary, 'query'), controller.summary);

router.get('/', validate(schemas.list, 'query'), controller.list);

router.get('/:id', validate(schemas.idParam, 'params'), controller.get);

router.patch(
	'/:id/status',
	validate(schemas.idParam, 'params'),
	validate(schemas.updateStatus),
	controller.updateStatus
);

module.exports = router;
