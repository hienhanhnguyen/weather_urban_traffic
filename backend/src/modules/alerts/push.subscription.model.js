const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../shared/database');

class PushSubscription extends Model { }

PushSubscription.init(
	{
		subscription_id: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		user_id: { type: DataTypes.INTEGER, allowNull: false },
		endpoint: { type: DataTypes.TEXT, allowNull: false, unique: true },
		p256dh: { type: DataTypes.STRING(255), allowNull: false },
		auth: { type: DataTypes.STRING(255), allowNull: false },
		user_agent: { type: DataTypes.STRING(255), allowNull: true },
		last_used_at: { type: DataTypes.DATE, allowNull: true },
	},
	{
		sequelize,
		modelName: 'PushSubscription',
		tableName: 'push_subscription',
	}
);

module.exports = PushSubscription;