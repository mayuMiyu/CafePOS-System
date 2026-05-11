const db = require('../config/database');

const requireCashier = (req, res) => {
    if (!req.session?.user?.id) {
        res.status(401).json({ success: false, message: 'Not logged in' });
        return null;
    }

    return req.session.user;
};

const ensureSessionId = async (user, req) => {
    if (user.sessionId) return user.sessionId;

    const [result] = await db.execute(
        'INSERT INTO user_sessions (user_id, logged_in_at) VALUES (?, NOW())',
        [user.id]
    );

    req.session.user.sessionId = result.insertId;
    return result.insertId;
};

const normalizeMoney = value => Number(Number(value || 0).toFixed(2));

const checkoutOrder = async (req, res) => {
    const user = requireCashier(req, res);
    if (!user) return;

    const {
        items = [],
        subtotal,
        tax_amount,
        discount_amount = 0,
        total,
        payment_method,
        notes = ''
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Order items are required' });
    }

    if (!['cash', 'gcash'].includes(payment_method)) {
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    try {
        const sessionId = await ensureSessionId(user, req);

        const [orderResult] = await db.execute(
            `INSERT INTO orders
                (cashier_id, session_id, status, subtotal, tax_amount, discount_amount, total, payment_method, notes, completed_at)
             VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?, NOW())`,
            [
                user.id,
                sessionId,
                normalizeMoney(subtotal),
                normalizeMoney(tax_amount),
                normalizeMoney(discount_amount),
                normalizeMoney(total),
                payment_method,
                notes || null
            ]
        );

        const orderId = orderResult.insertId;

        for (const item of items) {
            const quantity = Number(item.quantity || 1);
            const unitPrice = normalizeMoney(item.unitPrice);
            const lineSubtotal = normalizeMoney(unitPrice * quantity);

            const [itemResult] = await db.execute(
                `INSERT INTO order_items
                    (order_id, product_id, product_name, product_size_id, size_label, quantity, unit_price, line_subtotal)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    orderId,
                    item.productId,
                    item.productName,
                    item.sizeId || null,
                    item.sizeLabel || null,
                    quantity,
                    unitPrice,
                    lineSubtotal
                ]
            );

            const orderItemId = itemResult.insertId;

            for (const addon of item.addons || []) {
                const addonPrice = normalizeMoney(addon.extra_price);
                await db.execute(
                    `INSERT INTO order_item_addons
                        (order_item_id, addon_id, addon_name, quantity, addon_price, addon_subtotal)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        orderItemId,
                        addon.id,
                        addon.name,
                        quantity,
                        addonPrice,
                        normalizeMoney(addonPrice * quantity)
                    ]
                );
            }
        }

        await db.execute(
            `INSERT INTO payments
                (order_id, payment_method, amount_due, amount_received, change_due, reference_no)
             VALUES (?, ?, ?, ?, 0, NULL)`,
            [orderId, payment_method, normalizeMoney(total), normalizeMoney(total)]
        );

        res.json({ success: true, order_id: orderId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Checkout failed' });
    }
};

const getProfileTransactions = async (req, res) => {
    const user = requireCashier(req, res);
    if (!user) return;

    try {
        const sessionId = await ensureSessionId(user, req);
        const [transactions] = await db.execute(
            `SELECT
                o.id,
                o.status,
                o.subtotal,
                o.tax_amount,
                o.discount_amount,
                o.total,
                o.payment_method,
                o.created_at,
                o.completed_at,
                (
                    SELECT COALESCE(SUM(oi.quantity), 0)
                    FROM order_items oi
                    WHERE oi.order_id = o.id
                ) AS item_count
             FROM orders o
             WHERE o.cashier_id = ?
             ORDER BY o.created_at DESC`,
            [user.id]
        );

        const [[totalSummary]] = await db.execute(
            `SELECT COUNT(*) AS total_transactions
             FROM orders
             WHERE cashier_id = ?`,
            [user.id]
        );

        const [[sessionSummary]] = await db.execute(
            `SELECT
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) AS session_revenue
             FROM orders
             WHERE cashier_id = ?
                AND session_id = ?`,
            [user.id, sessionId]
        );

        const [[timeSummary]] = await db.execute(
            `SELECT
                COALESCE(SUM(
                    TIMESTAMPDIFF(
                        SECOND,
                        logged_in_at,
                        COALESCE(logged_out_at, NOW())
                    )
                ), 0) AS total_time_seconds,
                COALESCE(MAX(CASE WHEN id = ? THEN TIMESTAMPDIFF(SECOND, logged_in_at, NOW()) END), 0) AS session_time_seconds
             FROM user_sessions
             WHERE user_id = ?`,
            [sessionId, user.id]
        );

        res.json({
            success: true,
            cashier: {
                id: user.id,
                name: user.name,
                username: user.username
            },
            summary: {
                totalTransactions: Number(totalSummary.total_transactions || 0),
                totalTimeSeconds: Number(timeSummary.total_time_seconds || 0),
                sessionTimeSeconds: Number(timeSummary.session_time_seconds || 0),
                sessionRevenue: Number(sessionSummary.session_revenue || 0)
            },
            transactions
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load transactions' });
    }
};

const getTransactionDetails = async (req, res) => {
    const user = requireCashier(req, res);
    if (!user) return;

    try {
        const [[order]] = await db.execute(
            `SELECT
                o.*,
                p.amount_due,
                p.amount_received,
                p.change_due,
                p.reference_no,
                p.paid_at
             FROM orders o
             LEFT JOIN payments p ON p.order_id = o.id
             WHERE o.id = ?
                AND o.cashier_id = ?`,
            [req.params.id, user.id]
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        const [items] = await db.execute(
            'SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC',
            [order.id]
        );

        for (const item of items) {
            const [addons] = await db.execute(
                'SELECT * FROM order_item_addons WHERE order_item_id = ? ORDER BY id ASC',
                [item.id]
            );
            item.addons = addons;
        }

        res.json({ success: true, order, items });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load transaction details' });
    }
};

const updateOrderStatus = async (req, res) => {
    const user = requireCashier(req, res);
    if (!user) return;

    const { status } = req.body;
    const statusColumn = {
        voided: 'voided_at',
        refunded: 'refunded_at'
    }[status];

    if (!statusColumn) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    try {
        const [result] = await db.execute(
            `UPDATE orders
             SET status = ?, ${statusColumn} = NOW()
             WHERE id = ?
                AND cashier_id = ?`,
            [status, req.params.id, user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update transaction' });
    }
};

module.exports = {
    checkoutOrder,
    getProfileTransactions,
    getTransactionDetails,
    updateOrderStatus
};
