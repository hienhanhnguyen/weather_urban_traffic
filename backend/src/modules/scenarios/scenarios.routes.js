const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const authorize = require('../../shared/authorize');
const schemas = require('./scenarios.schemas');
const controller = require('./scenarios.controller');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', validate(schemas.list, 'query'), controller.list);
router.post('/', validate(schemas.create), controller.create);

router.get('/:id', validate(schemas.idParam, 'params'), controller.get);
router.put(
	'/:id',
	validate(schemas.idParam, 'params'),
	validate(schemas.update),
	controller.update
);
router.delete('/:id', validate(schemas.idParam, 'params'), controller.remove);

module.exports = router;
