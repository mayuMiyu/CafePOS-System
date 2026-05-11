const express = require('express');
const {
    checkoutOrder,
    getProfileTransactions,
    getTransactionDetails,
    updateOrderStatus
} = require('../controller/orderController');

const router = express.Router();

router.post('/orders/checkout', checkoutOrder);
router.get('/profile/transactions', getProfileTransactions);
router.get('/profile/transactions/:id', getTransactionDetails);
router.patch('/orders/:id/status', updateOrderStatus);

module.exports = router;
