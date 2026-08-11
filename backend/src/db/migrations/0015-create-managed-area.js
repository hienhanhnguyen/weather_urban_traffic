const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('managed_area', {
			area_id: {
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
			name: {
				type: DataTypes.STRING(120),
				allowNull: false,
			},
			area_type: {
				type: DataTypes.ENUM('district', 'ward'),
				allowNull: false,
				defaultValue: 'ward',
			},
			address: {
				type: DataTypes.STRING(255),
				allowNull: true,
			},
			boundary: {
				type: DataTypes.JSONB,
				allowNull: false,
			},
			center_latitude: {
				type: DataTypes.DOUBLE,
				allowNull: false,
			},
			center_longitude: {
				type: DataTypes.DOUBLE,
				allowNull: false,
			},
			area_km2: {
				type: DataTypes.DOUBLE,
				allowNull: false,
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

		await queryInterface.addIndex('managed_area', ['user_id', 'name'], {
			name: 'managed_area_user_id_name_key',
			unique: true,
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('managed_area');
	},
};
