const config = require('../../src/shared/config');
const { sequelize } = require('../../src/shared/database');
const { migrator } = require('../../src/db/umzug');
const { clearOutbox } = require('../../src/shared/mailer');

const ROLES = ['user', 'moderator', 'admin'];

/** Fail closed: never touch a database that isn't
obviously a test database. */
const assertTestDatabase = () => {
	const name = config.db.name || '';
	if (!/_test$/.test(name)) {
		throw new Error(
			`Refusing to operate on database "${name}" — `
			+
			'the test database name must end with "_test".'
		);
	}
};

async function setupTestDatabase() {
	assertTestDatabase();
	await migrator.up();
}

async function truncateAll() {
	clearOutbox();
	assertTestDatabase();

	const [rows] = await sequelize.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> 'schema_migrations'
    `);

	if (rows.length === 0) return;

	const tables = rows.map((row) =>
		`"${row.tablename}"`).join(', ');
	await sequelize.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE;`);

	await sequelize.getQueryInterface().bulkInsert('role',
		ROLES.map((name) => ({
			name,
			created_at: new Date(),
			updated_at: new Date(),
		}))
	);
}

async function closeTestDatabase() {
	await sequelize.close();
}

module.exports = {
	setupTestDatabase, truncateAll,
	closeTestDatabase
};