const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const schemas = require('./routing.schemas');
const controller = require('./routing.controller');

const routes = express.Router();

routes.use(authenticate);

routes.get('/', validate(schemas.listRoutes, 'query'), controller.list);
routes.post('/', validate(schemas.createRoute), controller.create);

routes.get('/:id', validate(schemas.idParam, 'params'), controller.get);
routes.patch(
	'/:id',
	validate(schemas.idParam, 'params'),
	validate(schemas.updateRoute),
	controller.update
);
routes.delete('/:id', validate(schemas.idParam, 'params'), controller.remove);

const history = express.Router();

history.use(authenticate);

history.get(
	'/routes',
	validate(schemas.listRouteSearches, 'query'),
	controller.listRouteSearches
);
history.post(
	'/routes',
	validate(schemas.recordRouteSearch),
	controller.recordRouteSearch
);
history.delete('/routes', controller.clearRouteSearches);

history.get(
	'/weather',
	validate(schemas.listWeatherSearches, 'query'),
	controller.listWeatherSearches
);
history.post(
	'/weather',
	validate(schemas.recordWeatherSearch),
	controller.recordWeatherSearch
);
history.delete('/weather', controller.clearWeatherSearches);

module.exports = { routes, history };
