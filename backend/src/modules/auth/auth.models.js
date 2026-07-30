const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

class RefreshToken extends Model { }
class OtpCode extends Model { }
class PasswordResetToken extends Model { }

RefreshToken.init(
	{
		id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		token_hash: { type: DataTypes.STRING(64), allowNull: false },
		expires_at: { type: DataTypes.DATE, allowNull: false },
		revoked_at: { type: DataTypes.DATE, allowNull: true },
		replaced_by: { type: DataTypes.INTEGER, allowNull: true },
	},
	{
		sequelize,
		modelName: 'RefreshToken',
		tableName: 'refresh_token',
		updatedAt: false,
	}
);

OtpCode.init(
	{
		id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		purpose: {
			type: DataTypes.ENUM('password_reset', 'email_verify'),
			allowNull: false,
		},
		code_hash: { type: DataTypes.STRING(64), allowNull: false },
		expires_at: { type: DataTypes.DATE, allowNull: false },
		attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
		consumed_at: { type: DataTypes.DATE, allowNull: true },
	},
	{
		sequelize,
		modelName: 'OtpCode',
		tableName: 'otp_code',
		updatedAt: false,
	}
);

PasswordResetToken.init(
	{
		id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		token_hash: { type: DataTypes.STRING(64), allowNull: false },
		expires_at: { type: DataTypes.DATE, allowNull: false },
		consumed_at: { type: DataTypes.DATE, allowNull: true },
	},
	{
		sequelize,
		modelName: 'PasswordResetToken',
		tableName: 'password_reset_token',
		updatedAt: false,
	}
);

module.exports = { RefreshToken, OtpCode, PasswordResetToken };