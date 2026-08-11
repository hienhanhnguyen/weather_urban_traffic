const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const schemas = require('./alerts.schemas');
const controller = require('./alerts.controller');

const router = express.Router();

router.use(authenticate);

router.get('/rules', validate(schemas.listRules, 'query'), controller.listRules);
router.post('/rules', validate(schemas.createRule), controller.createRule);

router.get(
	'/rules/:id',
	validate(schemas.idParam, 'params'),
	controller.getRule
);
router.patch(
	'/rules/:id',
	validate(schemas.idParam, 'params'),
	validate(schemas.updateRule),
	controller.updateRule
);
router.delete(
	'/rules/:id',
	validate(schemas.idParam, 'params'),
	controller.deleteRule
);

router.patch('/events/read-all', controller.markAllEventsRead);
router.get(
	'/events',
	validate(schemas.listEvents, 'query'),
	controller.listEvents
);
router.patch(
	'/events/:id/read',
	validate(schemas.idParam, 'params'),
	controller.markEventRead
);

router.get('/push-subscriptions/public-key', controller.pushConfig);
router.get('/push-subscriptions', controller.listPush);
router.post(
	'/push-subscriptions',
	validate(schemas.pushSubscription),
	controller.subscribePush
);
router.delete(
	'/push-subscriptions/:id',
	validate(schemas.idParam, 'params'),
	controller.unsubscribePush
);

module.exports = router;