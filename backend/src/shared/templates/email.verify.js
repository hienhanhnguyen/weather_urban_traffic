const config = require('../config');

module.exports = function emailVerifyTemplate({ code }) {
	const minutes = config.auth.otpTtlMinutes;

	return {
		subject: 'Confirm your email address',
		text: `Your verification code is ${code}. It expires in ${minutes} minutes.`,
		html: `<p>Your verification code is <strong>${code}</strong>.</p>
					 <p>It expires in ${minutes} minutes. If you did not create this account, you can ignore this email.</p>`,
	};
};
