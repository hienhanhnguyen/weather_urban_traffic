const { sequelize } = require('./database');
const User = require('../modules/users/user.model');
const Role = require('../modules/users/role.model');
const UserPreference = require('../modules/users/user.preference.model');
const SavedLocation = require('../modules/locations/location.model');
const { AlertRule, AlertEvent } = require('../modules/alerts/alert.models');
const {
	RefreshToken,
	OtpCode,
	PasswordResetToken,
} = require('../modules/auth/auth.models');
const PushSubscription = require('../modules/alerts/push.subscription.model');
const {
	SavedRoute,
	RouteSearch,
	WeatherSearch,
} = require('../modules/routing/routing.models');
const { ReportSchedule } = require('../modules/business/business.models');
const { ManagedArea } = require('../modules/areas/area.model');
const { AreaAlertRule } = require('../modules/areas/area.alert.model');


User.belongsToMany(Role, {
	through: 'user_role',
	foreignKey: 'user_id',
	otherKey: 'role_id',
	as: 'roles',
	timestamps: false,
});

Role.belongsToMany(User, {
	through: 'user_role',
	foreignKey: 'role_id',
	otherKey: 'user_id',
	as: 'users',
	timestamps: false,
});

User.hasOne(UserPreference, { foreignKey: 'user_id', as: 'preferences' });
UserPreference.belongsTo(User, { foreignKey: 'user_id' });

SavedLocation.hasMany(AlertRule, {
	foreignKey: 'location_id',
	as: 'rules',
	onDelete: 'CASCADE',
});
AlertRule.belongsTo(SavedLocation, {
	foreignKey: 'location_id',
	as: 'location',
});

AlertRule.hasMany(AlertEvent, { foreignKey: 'rule_id', as: 'events' });
AlertEvent.belongsTo(AlertRule, { foreignKey: 'rule_id', as: 'rule' });

ManagedArea.hasMany(AreaAlertRule, {
	foreignKey: 'area_id',
	as: 'alertRules',
	onDelete: 'CASCADE',
});
AreaAlertRule.belongsTo(ManagedArea, { foreignKey: 'area_id', as: 'area' });

ManagedArea.hasMany(AlertEvent, {
	foreignKey: 'area_id',
	as: 'events',
	onDelete: 'SET NULL',
});
AlertEvent.belongsTo(ManagedArea, { foreignKey: 'area_id', as: 'managedArea' });

SavedRoute.hasOne(ReportSchedule, {
	foreignKey: 'route_id',
	as: 'schedule',
	onDelete: 'CASCADE',
});
ReportSchedule.belongsTo(SavedRoute, { foreignKey: 'route_id', as: 'route' });

SavedLocation.hasMany(WeatherSearch, {
	foreignKey: 'location_id',
	as: 'searches',
	onDelete: 'SET NULL',
});
WeatherSearch.belongsTo(SavedLocation, {
	foreignKey: 'location_id',
	as: 'location',
});

for (const model of [
	RefreshToken,
	OtpCode,
	PasswordResetToken,
	SavedLocation,
	AlertRule,
	AlertEvent,
	PushSubscription,
	SavedRoute,
	RouteSearch,
	WeatherSearch,
	ReportSchedule,
	ManagedArea,
]) {
	model.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
	User.hasMany(model, { foreignKey: 'user_id' });
}

module.exports = {
	sequelize,
	User,
	Role,
	UserPreference,
	SavedLocation,
	AlertRule,
	AlertEvent,
	RefreshToken,
	OtpCode,
	PasswordResetToken,
	PushSubscription,
	SavedRoute,
	RouteSearch,
	WeatherSearch,
	ReportSchedule,
	ManagedArea,
	AreaAlertRule,
};