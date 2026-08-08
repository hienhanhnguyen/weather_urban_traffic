const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

class User extends Model { }

User.init(
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
		email_verified: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false,
		},
	},
	{
		sequelize,
		modelName: 'User',
		tableName: 'user_account',
		defaultScope: {
			attributes: { exclude: ['password_hash'] },
		},
		scopes: {
			withPassword: {},
		},
	}
);

module.exports = User;