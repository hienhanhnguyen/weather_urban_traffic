const service = require('./auth.service');

const signUp = async (req, res) => {
	res.status(201).json(await service.signUp(req.body));
};

const signIn = async (req, res) => {
	res.status(200).json(await service.signIn(req.body));
};

const google = async (req, res) => {
	res.status(200).json(await service.signInWithGoogle(req.body));
};

const refresh = async (req, res) => {
	res.status(200).json(await service.refresh(req.body));
};

const signOut = async (req, res) => {
	await service.signOut(req.body);
	res.status(204).send();
};

const forgotPassword = async (req, res) => {
	await service.requestPasswordReset(req.body);
	res.status(202).json({
		message: 'If that account exists, a reset code has been sent.',
	});
};

const verifyOtp = async (req, res) => {
	res.status(200).json(await service.verifyResetOtp(req.body));
};

const resetPassword = async (req, res) => {
	await service.resetPassword(req.body);
	res.status(200).json({ message: 'Password updated.' });
};

const sendEmailVerification = async (req, res) => {
	await service.sendEmailVerification(req.user.id);
	res.status(202).json({ message: 'A verification code has been sent.' });
};

const verifyEmail = async (req, res) => {
	res.status(200).json(await service.verifyEmail(req.user.id, req.body));
};

const me = async (req, res) => {
	res.status(200).json({ user: await service.getProfile(req.user.id) });
};

module.exports = {
	signUp,
	signIn,
	google,
	refresh,
	signOut,
	forgotPassword,
	verifyOtp,
	resetPassword,
	sendEmailVerification,
	verifyEmail,
	me,
};