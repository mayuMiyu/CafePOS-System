const express = require('express');
const {
    getManagerDashboard,
    getRegistrations,
    acceptRegistration,
    rejectRegistration
} = require('../controller/managerController');

const router = express.Router();

router.get('/manager/dashboard', getManagerDashboard);
router.get('/manager/registrations', getRegistrations);
router.post('/manager/registrations/:id/accept', acceptRegistration);
router.delete('/manager/registrations/:id', rejectRegistration);

module.exports = router;
