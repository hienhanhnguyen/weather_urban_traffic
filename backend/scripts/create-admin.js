const { sequelize } = require('../src/shared/database');
const { hashPassword } = require('../src/modules/auth/password');
const logger = require('../src/shared/logger');

const ROLE = 'admin';
const ACCOUNT_TYPE = 'admin_officer';

const UPSERT_USER = `
	INSERT INTO user_account (email, username, password_hash, account_type, email_verified)
	VALUES (:email, :username, :hash, '${ACCOUNT_TYPE}', true)
	ON CONFLICT (email) DO UPDATE SET
		password_hash = EXCLUDED.password_hash,
		account_type = EXCLUDED.account_type,
		email_verified = true,
		updated_at = CURRENT_TIMESTAMP
	RETURNING user_id
`;

const GRANT_ROLE = `
	INSERT INTO user_role (user_id, role_id)
	SELECT :userId, id FROM role WHERE name = '${ROLE}'
	ON CONFLICT DO NOTHING
`;

const run = async () => {
	const [email, password, username] = process.argv.slice(2);

	if (!email || !password) {
		logger.error('usage: node scripts/create-admin.js <email> <password> [username]');
		process.exitCode = 1;
		return;
	}

	const hash = await hashPassword(password);

	const [rows] = await sequelize.query(UPSERT_USER, {
		replacements: {
			email: email.trim().toLowerCase(),
			username: username ?? null,
			hash,
		},
	});

	const { user_id: userId } = rows[0];
	await sequelize.query(GRANT_ROLE, { replacements: { userId } });

	logger.info({ userId, email, role: ROLE }, 'admin account ready');
};

run()
	.catch((err) => {
		logger.error({ err }, 'create-admin failed');
		process.exitCode = 1;
	})
	.finally(() => sequelize.close());
