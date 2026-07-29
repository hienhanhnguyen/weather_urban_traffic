const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('user_account',
			{
				user_id: {
					type: DataTypes.INTEGER,
					primaryKey: true,
					autoIncrement: true,
				},
				email: {
					type: DataTypes.STRING(255),
					allowNull: false,
					unique: true,
				},
				username: {
					type: DataTypes.STRING(64),
					allowNull: true,
					unique: true,
				},
				password_hash: {
					type: DataTypes.STRING(255),
					allowNull: true,
				},
				account_type: {
					type: DataTypes.ENUM('individual', 'business', 'admin_officer'),
					allowNull: false,
					defaultValue: 'individual',
				},
				created_at: {
					type: DataTypes.DATE,
					allowNull: false,
					defaultValue: literal('CURRENT_TIMESTAMP'),
				},
				updated_at: {
					type: DataTypes.DATE,
					allowNull: false,
					defaultValue: literal('CURRENT_TIMESTAMP'),
				},
			});

		await queryInterface.createTable('user_role', {
			user_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				references: {
					model: 'user_account', key:
						'user_id'
				},
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			role_id: {
				type: DataTypes.INTEGER,
				primaryKey: true,
				references: { model: 'role', key: 'id' },
				onDelete: 'CASCADE',
				onUpdate: 'CASCADE',
			},
			created_at: {
				type: DataTypes.DATE,
				allowNull: false,
				defaultValue: literal('CURRENT_TIMESTAMP'),
			},
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('user_role');
		await queryInterface.dropTable('user_account');
		await queryInterface.sequelize.query(
			'DROP TYPE IF EXISTS "enum_user_account_account_type"; '
		);
	},
};