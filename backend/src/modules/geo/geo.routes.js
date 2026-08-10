const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const { geoLimiter } = require('../../shared/rate.limit');
const schemas = require('./geo.schemas');
const controller = require('./geo.controller');

const router = express.Router();

router.use(authenticate, geoLimiter);

router.get('/search', validate(schemas.search, 'query'), controller.search);
router.get('/reverse', validate(schemas.reverse, 'query'), controller.reverse);
router.get('/route', validate(schemas.route, 'query'), controller.route);

module.exports = router;
