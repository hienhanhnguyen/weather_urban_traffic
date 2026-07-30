const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('otp_code', {
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			user_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: { model: 'user_account', key: 'user_id' },
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			purpose: {
				type: DataTypes.ENUM('password_reset', 'email_verify'),
				allowNull: false,
			},
			code_hash: {
				type: DataTypes.STRING(64),
				allowNull: false,
			},
			expires_at: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			attempts: {
				type: DataTypes.INTEGER,
				allowNull: false,
				defaultValue: 0,
			},
			consumed_at: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			created_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
		});

		await queryInterface.addIndex('otp_code', ['user_id', 'purpose'], {
			name: 'otp_code_user_purpose_idx',
		});

		await queryInterface.createTable('password_reset_token', {
			id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				autoIncrement: true,
			},
			user_id: {
				type: DataTypes.INTEGER,
				allowNull: false,
				references: { model: 'user_account', key: 'user_id' },
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			token_hash: {
				type: DataTypes.STRING(64),
				allowNull: false,
				unique: true,
			},
			expires_at: {
				type: DataTypes.DATE,
				allowNull: false,
			},
			consumed_at: {
				type: DataTypes.DATE,
				allowNull: true,
			},
			created_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('password_reset_token');
		await queryInterface.dropTable('otp_code');
		await queryInterface.sequelize.query(
			'DROP TYPE IF EXISTS "enum_otp_code_purpose";'
		);
	},
};