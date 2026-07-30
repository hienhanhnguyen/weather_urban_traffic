const { OAuth2Client } = require('google-auth-library');
const config = require('../../shared/config');
const { UnauthorizedError } = require('../../shared/errors');

const client = new OAuth2Client(config.auth.googleClientId);

async function verifyGoogleIdToken(idToken) {
	if (!config.auth.googleClientId) {
		throw new UnauthorizedError('Google sign-in is not configured', {
			code: 'GOOGLE_NOT_CONFIGURED',
		});
	}

	try {
		const ticket = await client.verifyIdToken({
			idToken,
			audience: config.auth.googleClientId,
		});
		return ticket.getPayload();
	} catch {
		throw new UnauthorizedError('Invalid Google credential', {
			code: 'INVALID_GOOGLE_TOKEN',
		});
	}
}

module.exports = { verifyGoogleIdToken };