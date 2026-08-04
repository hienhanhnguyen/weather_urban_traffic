const { DataTypes, literal } = require('sequelize');

module.exports = {
	async up({ context: queryInterface }) {
		await queryInterface.createTable('saved_location', {
			location_id: {
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
			custom_name: {
				type: DataTypes.STRING(255),
				allowNull: false,
			},
			address: {
				type: DataTypes.TEXT,
				allowNull: true,
			},
			latitude: {
				type: DataTypes.DECIMAL(10, 6),
				allowNull: false,
			},
			longitude: {
				type: DataTypes.DECIMAL(10, 6),
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

		await queryInterface.addIndex('saved_location', ['user_id'], {
			name: 'saved_location_user_id_idx',
		});
	},

	async down({ context: queryInterface }) {
		await queryInterface.dropTable('saved_location');
	},
};