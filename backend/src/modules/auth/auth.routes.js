const express = require('express');
const validate = require('../../shared/validate');
const authenticate = require('../../shared/authenticate');
const schemas = require('./auth.schemas');
const controller = require('./auth.controller');
const {
	signUpLimiter,
	signInLimiter,
	forgotLimiter,
	otpLimiter,
	emailVerifySendLimiter,
	emailVerifyCheckLimiter,
	passwordChangeLimiter,
} = require('../../shared/rate.limit');

const router = express.Router();

router.post(
	'/signup',
	signUpLimiter,
	validate(schemas.signUp),
	controller.signUp
);
router.post(
	'/signin',
	signInLimiter,
	validate(schemas.signIn),
	controller.signIn
);
router.post('/google', signInLimiter, validate(schemas.google), controller.google);
router.post('/refresh', validate(schemas.refresh), controller.refresh);
router.post('/signout', validate(schemas.refresh), controller.signOut);

router.post(
	'/password/forgot',
	forgotLimiter,
	validate(schemas.forgotPassword),
	controller.forgotPassword
);
router.post(
	'/password/verify-otp',
	otpLimiter,
	validate(schemas.verifyOtp),
	controller.verifyOtp
);
router.post(
	'/password/reset',
	validate(schemas.resetPassword),
	controller.resetPassword
);
router.post(
	'/password/change',
	authenticate,
	passwordChangeLimiter,
	validate(schemas.changePassword),
	controller.changePassword
);


router.post(
	'/email/send-verification',
	authenticate,
	emailVerifySendLimiter,
	controller.sendEmailVerification
);
router.post(
	'/email/verify',
	authenticate,
	emailVerifyCheckLimiter,
	validate(schemas.verifyEmail),
	controller.verifyEmail
);

router.get('/me', authenticate, controller.me);

module.exports = router;