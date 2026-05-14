const express = require('express');
const {
    checkoutOrder,
    getKitchenOrders,
    completeKitchenOrder,
    getProfileTransactions,
    getTransactionDetails,
    updateOrderStatus
} = require('../controller/orderController');

const router = express.Router();

router.post('/orders/checkout', checkoutOrder);
router.get('/kitchen/orders', getKitchenOrders);
router.patch('/kitchen/orders/:id/complete', completeKitchenOrder);
router.get('/profile/transactions', getProfileTransactions);
router.get('/profile/transactions/:id', getTransactionDetails);
router.patch('/orders/:id/status', updateOrderStatus);

module.exports = router;
