const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const authorize = require('../../shared/authorize');
const schemas = require('./users.schemas');
const controller = require('./users.controller');

const router = express.Router();

router.use(authenticate);

router.get('/me', controller.getMe);
router.patch('/me', validate(schemas.updateProfile), controller.updateMe);

router.get('/me/preferences', controller.getPreferences);
router.put(
	'/me/preferences',
	validate(schemas.updatePreferences),
	controller.updatePreferences
);

router.get(
	'/',
	authorize('admin'),
	validate(schemas.listUsers, 'query'),
	controller.listUsers
);

router.put(
	'/:id/roles',
	authorize('admin'),
	validate(schemas.userIdParam, 'params'),
	validate(schemas.setRoles),
	controller.setRoles
);

module.exports = router;