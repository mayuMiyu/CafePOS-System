const express = require('express');
const router = express.Router();
const { login, logout, getCurrentUser } = require('../auth/loginauth');
const { sendCode, register, resetPassword } = require('../auth/registerauth');

router.post ('/login', login);
router.post('/logout', logout);
router.get('/me', getCurrentUser);
router.post ('/send-code', sendCode);
router.post ('/register', register);
router.post('/reset-password', resetPassword);
module.exports = router;
