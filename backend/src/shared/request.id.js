const crypto = require('crypto');
const logger = require('./logger');

const HEADER = 'x-request-id';
const SAFE_ID = /^[A-Za-z0-9._-]{8,128}$/;

function requestId(req, res, next) {
	const incoming = req.get(HEADER);

	req.id = SAFE_ID.test(incoming ?? '') ? incoming : crypto.randomUUID();

	res.setHeader('X-Request-Id', req.id);
	req.log = logger.child({ requestId: req.id });

	next();
}

module.exports = requestId;