const nodemailer = require('nodemailer');
const config = require('./config');
const logger = require('./logger');

const outbox = [];

function buildTransport() {
	// fake transport for test
	if (config.isTest) {
		return nodemailer.createTransport({ jsonTransport: true });
	}

	if (!config.mail.host) {
		if (config.isProduction) {
			throw new Error(
				'SMTP_HOST is required in production — refusing to start with mail disabled'
			);
		}
		logger.warn('SMTP is not configured — mail will be logged, not sent');
		// fake transport for dev
		return nodemailer.createTransport({ jsonTransport: true });
	}

	return nodemailer.createTransport({
		pool: true,
		maxConnections: 3,
		maxMessages: 50,
		host: config.mail.host,
		port: config.mail.port,
		secure: config.mail.secure,
		auth: config.mail.user
			? { user: config.mail.user, pass: config.mail.pass }
			: undefined,
	});
}

const transport = buildTransport();
const isRealTransport = Boolean(config.mail.host) && !config.isTest;

async function sendMail({ to, subject, html, text }) {
	const info = await transport.sendMail({
		from: config.mail.from,
		to,
		subject,
		html,
		text,
	});

	if (config.isTest) {
		outbox.push({ to, subject, html, text });
	} else if (!isRealTransport) {
		logger.info({ to, subject, text }, 'mail not sent (no SMTP configured)');
	}

	return info;
}

const readOutbox = () => outbox.slice();
const clearOutbox = () => {
	outbox.length = 0;
};

const closeMailer = async () => {
	if (typeof transport.close === 'function') transport.close();
};

module.exports = { sendMail, readOutbox, clearOutbox, closeMailer };