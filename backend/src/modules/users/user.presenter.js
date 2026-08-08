const publicUser = (user, roles) => ({
	id: user.user_id,
	email: user.email,
	username: user.username,
	accountType: user.account_type,
	emailVerified: user.email_verified,
	roles,
});

module.exports = { publicUser };
