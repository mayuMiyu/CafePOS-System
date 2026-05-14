const express = require('express');
const {
    getManagerDashboard,
    getRegistrations,
    acceptRegistration,
    rejectRegistration,
    getStaffProfiles,
    updateStaffStatus,
    getMenuProducts,
    updateProductAvailability
} = require('../controller/managerController');

const router = express.Router();

router.get('/manager/dashboard', getManagerDashboard);
router.get('/manager/registrations', getRegistrations);
router.post('/manager/registrations/:id/accept', acceptRegistration);
router.delete('/manager/registrations/:id', rejectRegistration);
router.get('/manager/staff', getStaffProfiles);
router.patch('/manager/staff/:id/status', updateStaffStatus);
router.get('/manager/products', getMenuProducts);
router.patch('/manager/products/:id/availability', updateProductAvailability);

module.exports = router;
