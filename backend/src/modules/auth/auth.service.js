const { sequelize, User, Role, RefreshToken, OtpCode, PasswordResetToken } =
	require('../../shared/models');
const config = require('../../shared/config');
const logger = require('../../shared/logger');
const {
	ConflictError,
	UnauthorizedError,
	NotFoundError,
} = require('../../shared/errors');
const { hashPassword, verifyPassword } = require('./password');
const {
	sha256,
	randomToken,
	generateOtp,
	safeEqual,
	signAccessToken,
} = require('./auth.tokens');
const { verifyGoogleIdToken } = require('./google');
const { publicUser } = require('../users/user.presenter');
const { sendMail } = require('../../shared/mailer');
const passwordResetTemplate = require('../../shared/templates/password.reset');
const emailVerifyTemplate = require('../../shared/templates/email.verify');

const DEFAULT_ROLE = 'user';
const OTP_PURPOSE = 'password_reset';
const VERIFY_PURPOSE = 'email_verify';
const INVALID_CREDENTIALS = 'Invalid email or password';

const withRoles = {
	include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
};

const normaliseEmail = (email) => email.trim().toLowerCase();

const roleNames = (user) => (user.roles ?? []).map((role) => role.name);


async function issueTokens(user, roles, transaction) {
	const accessToken = signAccessToken(user, roles);
	const refreshToken = randomToken();

	const record = await RefreshToken.create(
		{
			user_id: user.user_id,
			token_hash: sha256(refreshToken),
			expires_at: new Date(
				Date.now() + config.auth.refreshTtlDays * 86_400_000
			),
		},
		{ transaction }
	);

	return { accessToken, refreshToken, refreshTokenId: record.id };
}

async function issueOtp({ userId, purpose }) {
	await OtpCode.update(
		{ consumed_at: new Date() },
		{ where: { user_id: userId, purpose, consumed_at: null } }
	);

	const code = generateOtp();

	await OtpCode.create({
		user_id: userId,
		purpose,
		code_hash: sha256(code),
		expires_at: new Date(Date.now() + config.auth.otpTtlMinutes * 60_000),
	});

	return code;
}

async function redeemOtp({ userId, purpose, code }, onValid) {
	return sequelize.transaction(async (transaction) => {
		const otp = await OtpCode.findOne({
			where: { user_id: userId, purpose, consumed_at: null },
			order: [['created_at', 'DESC']],
			transaction,
			lock: transaction.LOCK.UPDATE,
		});

		if (!otp || otp.expires_at <= new Date()) return { status: 'invalid' };

		if (otp.attempts >= config.auth.otpMaxAttempts) {
			await otp.update({ consumed_at: new Date() }, { transaction });
			return { status: 'invalid' };
		}

		if (!safeEqual(otp.code_hash, sha256(code))) {
			const attempts = otp.attempts + 1;
			await otp.update(
				{
					attempts,
					consumed_at:
						attempts >= config.auth.otpMaxAttempts ? new Date() : null,
				},
				{ transaction }
			);
			return { status: 'invalid' };
		}

		await otp.update({ consumed_at: new Date() }, { transaction });

		return { status: 'ok', value: await onValid(transaction) };
	});
}

async function deliverOtpMail({ to, template, userId, kind }) {
	try {
		await sendMail({ to, ...template });
		logger.info({ userId }, `${kind} code sent`);
	} catch (err) {
		logger.error({ err, userId }, `${kind} code could not be delivered`);
	}
}

async function findOrCreateWithRole(attributes, transaction) {
	const defaultRole = await Role.findOne({
		where: { name: DEFAULT_ROLE },
		transaction,
	});

	if (!defaultRole) {
		throw new Error(
			`Default role "${DEFAULT_ROLE}" is missing - did migrations run?`
		);
	}

	let user;
	try {
		user = await User.create(attributes, { transaction });
	} catch (err) {
		if (err.name === 'SequelizeUniqueConstraintError') {
			throw new ConflictError(
				'An account with those details already exists',
				{ code: 'ACCOUNT_EXISTS' }
			);
		}
		throw err;
	}

	await user.addRole(defaultRole, { transaction });
	return user;
}

async function signUp({ email, password, username, accountType }) {
	const password_hash = await hashPassword(password);

	return sequelize.transaction(async (transaction) => {
		const user = await findOrCreateWithRole(
			{
				email: normaliseEmail(email),
				username: username ?? null,
				password_hash,
				account_type: accountType,
				email_verified: false,
			},
			transaction
		);

		const { accessToken, refreshToken } = await issueTokens(
			user,
			[DEFAULT_ROLE],
			transaction
		);

		return {
			user: publicUser(user, [DEFAULT_ROLE]),
			accessToken,
			refreshToken,
		};
	});
}

async function signIn({ email, password }) {
	const user = await User.scope('withPassword').findOne({
		where: { email: normaliseEmail(email) },
		...withRoles,
	});

	const passwordMatches = await verifyPassword(
		password,
		user?.password_hash ?? null
	);

	if (!user || !passwordMatches) {
		throw new UnauthorizedError(INVALID_CREDENTIALS, {
			code: 'INVALID_CREDENTIALS',
		});
	}

	const roles = roleNames(user);
	const { accessToken, refreshToken } = await issueTokens(user, roles);

	return { user: publicUser(user, roles), accessToken, refreshToken };
}

async function signInWithGoogle({ idToken }) {
	const payload = await verifyGoogleIdToken(idToken);

	if (!payload.email || !payload.email_verified) {
		throw new UnauthorizedError('Google account email is not verified', {
			code: 'GOOGLE_EMAIL_UNVERIFIED',
		});
	}

	const email = normaliseEmail(payload.email);

	return sequelize.transaction(async (transaction) => {
		let user = await User.findOne({
			where: { email },
			...withRoles,
			transaction,
		});

		if (!user) {
			// verifyGoogleIdToken already refused an unverified address above, so Google has done the round trip
			await findOrCreateWithRole(
				{
					email,
					username: null,
					password_hash: null,
					email_verified: true,
				},
				transaction
			);
			user = await User.findOne({
				where: { email },
				...withRoles,
				transaction,
			});
		}

		const roles = roleNames(user);
		const { accessToken, refreshToken } = await issueTokens(
			user,
			roles,
			transaction
		);

		return { user: publicUser(user, roles), accessToken, refreshToken };
	});
}

async function refresh({ refreshToken }) {
	const tokenHash = sha256(refreshToken);

	const outcome = await sequelize.transaction(async (transaction) => {
		const existing = await RefreshToken.findOne({
			where: { token_hash: tokenHash },
			transaction,
			lock: transaction.LOCK.UPDATE,
		});

		if (!existing) return { status: 'invalid' };

		if (existing.revoked_at) {
			return { status: 'reused', userId: existing.user_id };
		}

		if (existing.expires_at <= new Date()) return { status: 'invalid' };

		const user = await User.findByPk(existing.user_id, {
			...withRoles,
			transaction,
		});
		if (!user) return { status: 'invalid' };

		const roles = roleNames(user);
		const issued = await issueTokens(user, roles, transaction);

		await existing.update(
			{ revoked_at: new Date(), replaced_by: issued.refreshTokenId },
			{ transaction }
		);

		return {
			status: 'ok',
			payload: {
				user: publicUser(user, roles),
				accessToken: issued.accessToken,
				refreshToken: issued.refreshToken,
			},
		};
	});

	if (outcome.status === 'reused') {
		await RefreshToken.update(
			{ revoked_at: new Date() },
			{ where: { user_id: outcome.userId, revoked_at: null } }
		);
		logger.warn(
			{ userId: outcome.userId },
			'refresh token reuse detected — revoked entire family'
		);
		throw new UnauthorizedError('Invalid refresh token', {
			code: 'REFRESH_TOKEN_REUSED',
		});
	}

	if (outcome.status === 'invalid') {
		throw new UnauthorizedError('Invalid refresh token', {
			code: 'INVALID_REFRESH_TOKEN',
		});
	}

	return outcome.payload;
}

async function signOut({ refreshToken }) {
	await RefreshToken.update(
		{ revoked_at: new Date() },
		{ where: { token_hash: sha256(refreshToken), revoked_at: null } }
	);
}

async function requestPasswordReset({ email }) {
	const user = await User.findOne({ where: { email: normaliseEmail(email) } });

	if (!user) {
		logger.info('password reset requested for an unregistered address');
		return;
	}

	const code = await issueOtp({ userId: user.user_id, purpose: OTP_PURPOSE });

	await deliverOtpMail({
		to: user.email,
		template: passwordResetTemplate({ code }),
		userId: user.user_id,
		kind: 'password reset',
	});
}

async function verifyResetOtp({ email, code }) {
	const invalid = () =>
		new UnauthorizedError('Invalid or expired code', { code: 'INVALID_OTP' });

	const user = await User.findOne({ where: { email: normaliseEmail(email) } });
	if (!user) throw invalid();

	const outcome = await redeemOtp(
		{ userId: user.user_id, purpose: OTP_PURPOSE, code },
		async (transaction) => {
			const resetToken = randomToken();

			await PasswordResetToken.create(
				{
					user_id: user.user_id,
					token_hash: sha256(resetToken),
					expires_at: new Date(
						Date.now() + config.auth.resetTokenTtlMinutes * 60_000
					),
				},
				{ transaction }
			);

			return resetToken;
		}
	);

	if (outcome.status === 'invalid') throw invalid();
	return { resetToken: outcome.value };
}

async function sendEmailVerification(userId) {
	const user = await User.findByPk(userId);
	if (!user) throw new NotFoundError('User not found');

	if (user.email_verified) {
		throw new ConflictError('This email address is already verified', {
			code: 'EMAIL_ALREADY_VERIFIED',
		});
	}

	const code = await issueOtp({ userId, purpose: VERIFY_PURPOSE });

	await deliverOtpMail({
		to: user.email,
		template: emailVerifyTemplate({ code }),
		userId,
		kind: 'email verification',
	});
}

async function verifyEmail(userId, { code }) {
	const user = await User.findByPk(userId, withRoles);
	if (!user) throw new NotFoundError('User not found');

	if (user.email_verified) {
		throw new ConflictError('This email address is already verified', {
			code: 'EMAIL_ALREADY_VERIFIED',
		});
	}

	const outcome = await redeemOtp(
		{ userId, purpose: VERIFY_PURPOSE, code },
		(transaction) =>
			User.update(
				{ email_verified: true },
				{ where: { user_id: userId }, transaction }
			)
	);

	if (outcome.status === 'invalid') {
		throw new UnauthorizedError('Invalid or expired code', {
			code: 'INVALID_OTP',
		});
	}

	user.email_verified = true;
	return { user: publicUser(user, roleNames(user)) };
}

async function resetPassword({ resetToken, newPassword }) {
	const tokenHash = sha256(resetToken);
	const password_hash = await hashPassword(newPassword);

	await sequelize.transaction(async (transaction) => {
		const record = await PasswordResetToken.findOne({
			where: { token_hash: tokenHash },
			transaction,
			lock: transaction.LOCK.UPDATE,
		});

		if (
			!record ||
			record.consumed_at ||
			record.expires_at <= new Date()
		) {
			throw new UnauthorizedError('Invalid or expired reset token', {
				code: 'INVALID_RESET_TOKEN',
			});
		}

		await User.update(
			{ password_hash },
			{ where: { user_id: record.user_id }, transaction }
		);

		await record.update({ consumed_at: new Date() }, { transaction });

		await RefreshToken.update(
			{ revoked_at: new Date() },
			{ where: { user_id: record.user_id, revoked_at: null }, transaction }
		);
	});
}

async function getProfile(userId) {
	const user = await User.findByPk(userId, withRoles);
	if (!user) throw new NotFoundError('User not found');
	return publicUser(user, roleNames(user));
}

module.exports = {
	signUp,
	signIn,
	signInWithGoogle,
	refresh,
	signOut,
	requestPasswordReset,
	verifyResetOtp,
	resetPassword,
	sendEmailVerification,
	verifyEmail,
	getProfile,
};