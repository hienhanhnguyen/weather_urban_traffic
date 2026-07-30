const bcrypt = require('bcrypt');
const config = require('../../shared/config');

const DUMMY_HASH = bcrypt.hashSync(
	'timing-attack-mitigation-placeholder',
	config.auth.bcryptRounds
);

const hashPassword = (plain) => bcrypt.hash(plain, config.auth.bcryptRounds);

const verifyPassword = async (plain, hash) => {
	if (!hash) {
		await bcrypt.compare(plain, DUMMY_HASH);
		return false;
	}
	return bcrypt.compare(plain, hash);
};

module.exports = { hashPassword, verifyPassword };