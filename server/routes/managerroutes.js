const express = require('express');
const { getManagerDashboard } = require('../controller/managerController');

const router = express.Router();

router.get('/manager/dashboard', getManagerDashboard);

module.exports = router;
