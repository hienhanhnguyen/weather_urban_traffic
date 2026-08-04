const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const schemas = require('./locations.schemas');
const controller = require('./locations.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(schemas.list, 'query'), controller.list);
router.post('/', validate(schemas.create), controller.create);

router.get('/:id', validate(schemas.idParam, 'params'), controller.get);
router.patch(
	'/:id',
	validate(schemas.idParam, 'params'),
	validate(schemas.update),
	controller.update
);
router.delete('/:id', validate(schemas.idParam, 'params'), controller.remove);

module.exports = router;