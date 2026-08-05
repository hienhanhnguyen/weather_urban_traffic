const config = require('../config');

module.exports = function passwordResetTemplate({ code }) {
	const minutes = config.auth.otpTtlMinutes;

	return {
		subject: 'Your password reset code',
		text:
			`Your password reset code is ${code}.\n\n` +
			`It expires in ${minutes} minutes. ` +
			'If you did not request this, you can ignore this email.',
		html:
			`<p>Your password reset code is <strong style="font-size:20px;letter-spacing:3px">${code}</strong>.</p>` +
			`<p>It expires in ${minutes} minutes.</p> ` +
			'<p>If you did not request this, you can ignore this email.</p>',
	};
};