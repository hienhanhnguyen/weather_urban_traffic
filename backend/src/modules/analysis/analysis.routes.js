const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const requireAccountType = require('../../shared/require.account.type');
const schemas = require('./analysis.schemas');
const controller = require('./analysis.controller');

const router = express.Router();

router.use(authenticate);
router.use(requireAccountType('business'));

router.get('/risk', validate(schemas.assess, 'query'), controller.assess);

module.exports = router;
