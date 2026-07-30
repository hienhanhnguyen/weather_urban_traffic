const { sequelize } = require('./database');
const User = require('../modules/users/user.model');
const Role = require('../modules/users/role.model');
const {
	RefreshToken,
	OtpCode,
	PasswordResetToken,
} = require('../modules/auth/auth.models');

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

for (const model of [RefreshToken, OtpCode, PasswordResetToken]) {
	model.belongsTo(User, { foreignKey: 'user_id', onDelete: 'CASCADE' });
	User.hasMany(model, { foreignKey: 'user_id' });
}

module.exports = {
	sequelize,
	User,
	Role,
	RefreshToken,
	OtpCode,
	PasswordResetToken,
};