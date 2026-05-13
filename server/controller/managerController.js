const db = require('../config/database');

const requireManager = (req, res) => {
    if (!req.session?.user?.id) {
        res.status(401).json({ success: false, message: 'Not logged in' });
        return null;
    }

    if (req.session.user.role !== 'Manager') {
        res.status(403).json({ success: false, message: 'Manager access required' });
        return null;
    }

    return req.session.user;
};

const fetchPendingRegistrations = async (executor = db) => {
    const [registrations] = await executor.execute(
        `SELECT id, username, name, email, role, status, submitted_at
         FROM registrations
         WHERE status = 'Pending'
         ORDER BY submitted_at DESC
         LIMIT 10`
    );

    return registrations;
};

const fetchStaffProfiles = async () => {
    const [staffProfiles] = await db.execute(
        `SELECT id, username, name, email, role, is_active, created_at
         FROM users
         ORDER BY created_at DESC, id DESC`
    );

    return staffProfiles;
};

const getManagerDashboard = async (req, res) => {
    const manager = requireManager(req, res);
    if (!manager) return;

    try {
        const [[stats]] = await db.execute(
            `SELECT
                COUNT(*) AS total_transactions,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END), 0) AS total_revenue,
                COALESCE(AVG(CASE WHEN status = 'completed' THEN total END), 0) AS avg_transaction
             FROM orders`
        );

        const [[itemsSold]] = await db.execute(
            `SELECT COALESCE(SUM(oi.quantity), 0) AS items_sold
             FROM order_items oi
             INNER JOIN orders o ON o.id = oi.order_id
             WHERE o.status = 'completed'`
        );

        const [auditRows] = await db.execute(
            `SELECT *
             FROM (
                SELECT
                    u.username,
                    u.name,
                    'listed' AS action_type,
                    'Listed an order' AS action_label,
                    CONCAT('Order #', o.id, ' - ', COALESCE(item_counts.item_count, 0), ' item(s), ₱', FORMAT(o.total, 2)) AS details,
                    o.completed_at AS event_time
                FROM orders o
                INNER JOIN users u ON u.id = o.cashier_id
                LEFT JOIN (
                    SELECT order_id, SUM(quantity) AS item_count
                    FROM order_items
                    GROUP BY order_id
                ) item_counts ON item_counts.order_id = o.id
                WHERE o.status = 'completed'
                    AND o.completed_at IS NOT NULL

                UNION ALL

                SELECT
                    u.username,
                    u.name,
                    'voided' AS action_type,
                    'Voided an order' AS action_label,
                    CONCAT('Order #', o.id, ' - Transaction cancelled') AS details,
                    o.voided_at AS event_time
                FROM orders o
                INNER JOIN users u ON u.id = o.cashier_id
                WHERE o.status = 'voided'
                    AND o.voided_at IS NOT NULL

                UNION ALL

                SELECT
                    u.username,
                    u.name,
                    'refunded' AS action_type,
                    'Refunded an order' AS action_label,
                    CONCAT('Order #', o.id, ' - ₱', FORMAT(o.total, 2), ' refunded') AS details,
                    o.refunded_at AS event_time
                FROM orders o
                INNER JOIN users u ON u.id = o.cashier_id
                WHERE o.status = 'refunded'
                    AND o.refunded_at IS NOT NULL

                UNION ALL

                SELECT
                    u.username,
                    u.name,
                    'clocked-in' AS action_type,
                    'Clocked in' AS action_label,
                    CONCAT('Started shift at ', DATE_FORMAT(us.logged_in_at, '%l:%i %p')) AS details,
                    us.logged_in_at AS event_time
                FROM user_sessions us
                INNER JOIN users u ON u.id = us.user_id

                UNION ALL

                SELECT
                    u.username,
                    u.name,
                    'clocked-out' AS action_type,
                    'Clocked out' AS action_label,
                    CONCAT(
                        'Ended shift at ',
                        DATE_FORMAT(us.logged_out_at, '%l:%i %p'),
                        ' - ',
                        ROUND(TIMESTAMPDIFF(MINUTE, us.logged_in_at, us.logged_out_at) / 60, 1),
                        ' hours worked'
                    ) AS details,
                    us.logged_out_at AS event_time
                FROM user_sessions us
                INNER JOIN users u ON u.id = us.user_id
                WHERE us.logged_out_at IS NOT NULL
             ) audit
             WHERE event_time IS NOT NULL
             ORDER BY event_time DESC
             LIMIT 100`
        );

        const [[dailyReport]] = await db.execute(
            `SELECT
                SUM(CASE WHEN status = 'completed' AND DATE(completed_at) = CURDATE() THEN 1 ELSE 0 END) AS transactions_made,
                SUM(CASE WHEN status = 'completed' AND DATE(completed_at) = CURDATE() - INTERVAL 1 DAY THEN 1 ELSE 0 END) AS transactions_made_yesterday,
                COALESCE(SUM(CASE WHEN status = 'completed' AND DATE(completed_at) = CURDATE() THEN total ELSE 0 END), 0) AS daily_revenue,
                COALESCE(SUM(CASE WHEN status = 'completed' AND DATE(completed_at) = CURDATE() - INTERVAL 1 DAY THEN total ELSE 0 END), 0) AS daily_revenue_yesterday,
                SUM(CASE WHEN status = 'refunded' AND DATE(refunded_at) = CURDATE() THEN 1 ELSE 0 END) AS orders_refunded,
                SUM(CASE WHEN status = 'refunded' AND DATE(refunded_at) = CURDATE() - INTERVAL 1 DAY THEN 1 ELSE 0 END) AS orders_refunded_yesterday,
                COALESCE(SUM(CASE WHEN status = 'refunded' AND DATE(refunded_at) = CURDATE() THEN total ELSE 0 END), 0) AS refunded_total,
                COALESCE(SUM(CASE WHEN status = 'refunded' AND DATE(refunded_at) = CURDATE() - INTERVAL 1 DAY THEN total ELSE 0 END), 0) AS refunded_total_yesterday,
                SUM(CASE WHEN status = 'voided' AND DATE(voided_at) = CURDATE() THEN 1 ELSE 0 END) AS orders_voided,
                SUM(CASE WHEN status = 'voided' AND DATE(voided_at) = CURDATE() - INTERVAL 1 DAY THEN 1 ELSE 0 END) AS orders_voided_yesterday,
                COALESCE(SUM(CASE WHEN status = 'voided' AND DATE(voided_at) = CURDATE() THEN total ELSE 0 END), 0) AS voided_total,
                COALESCE(SUM(CASE WHEN status = 'voided' AND DATE(voided_at) = CURDATE() - INTERVAL 1 DAY THEN total ELSE 0 END), 0) AS voided_total_yesterday
             FROM orders
             WHERE DATE(created_at) IN (CURDATE(), CURDATE() - INTERVAL 1 DAY)
                OR DATE(completed_at) IN (CURDATE(), CURDATE() - INTERVAL 1 DAY)
                OR DATE(refunded_at) IN (CURDATE(), CURDATE() - INTERVAL 1 DAY)
                OR DATE(voided_at) IN (CURDATE(), CURDATE() - INTERVAL 1 DAY)`
        );

        const [[hoursReport]] = await db.execute(
            `SELECT
                COALESCE(SUM(CASE
                    WHEN DATE(logged_in_at) = CURDATE()
                    THEN TIMESTAMPDIFF(SECOND, logged_in_at, COALESCE(logged_out_at, NOW()))
                    ELSE 0
                END), 0) AS seconds_clocked,
                COALESCE(SUM(CASE
                    WHEN DATE(logged_in_at) = CURDATE() - INTERVAL 1 DAY
                    THEN TIMESTAMPDIFF(SECOND, logged_in_at, COALESCE(logged_out_at, NOW()))
                    ELSE 0
                END), 0) AS seconds_clocked_yesterday,
                COUNT(DISTINCT CASE WHEN DATE(logged_in_at) = CURDATE() THEN user_id END) AS staff_count,
                COUNT(DISTINCT CASE WHEN DATE(logged_in_at) = CURDATE() - INTERVAL 1 DAY THEN user_id END) AS staff_count_yesterday
             FROM user_sessions
             WHERE DATE(logged_in_at) IN (CURDATE(), CURDATE() - INTERVAL 1 DAY)`
        );

        const registrations = await fetchPendingRegistrations();

        res.json({
            success: true,
            manager: {
                id: manager.id,
                name: manager.name,
                username: manager.username
            },
            stats: {
                totalTransactions: Number(stats.total_transactions || 0),
                totalRevenue: Number(stats.total_revenue || 0),
                itemsSold: Number(itemsSold.items_sold || 0),
                avgTransaction: Number(stats.avg_transaction || 0)
            },
            dailyReport: {
                transactionsMade: Number(dailyReport.transactions_made || 0),
                transactionsMadeYesterday: Number(dailyReport.transactions_made_yesterday || 0),
                dailyRevenue: Number(dailyReport.daily_revenue || 0),
                dailyRevenueYesterday: Number(dailyReport.daily_revenue_yesterday || 0),
                ordersRefunded: Number(dailyReport.orders_refunded || 0),
                ordersRefundedYesterday: Number(dailyReport.orders_refunded_yesterday || 0),
                refundedTotal: Number(dailyReport.refunded_total || 0),
                refundedTotalYesterday: Number(dailyReport.refunded_total_yesterday || 0),
                ordersVoided: Number(dailyReport.orders_voided || 0),
                ordersVoidedYesterday: Number(dailyReport.orders_voided_yesterday || 0),
                voidedTotal: Number(dailyReport.voided_total || 0),
                voidedTotalYesterday: Number(dailyReport.voided_total_yesterday || 0),
                hoursClocked: Number(hoursReport.seconds_clocked || 0) / 3600,
                hoursClockedYesterday: Number(hoursReport.seconds_clocked_yesterday || 0) / 3600,
                staffCount: Number(hoursReport.staff_count || 0),
                staffCountYesterday: Number(hoursReport.staff_count_yesterday || 0)
            },
            registrations,
            auditRows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load manager dashboard' });
    }
};

const getRegistrations = async (req, res) => {
    const manager = requireManager(req, res);
    if (!manager) return;

    try {
        const registrations = await fetchPendingRegistrations();
        res.json({ success: true, registrations });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load registrations' });
    }
};

const acceptRegistration = async (req, res) => {
    const manager = requireManager(req, res);
    if (!manager) return;

    const registrationId = Number(req.params.id);
    if (!Number.isInteger(registrationId) || registrationId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid registration id' });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [[registration]] = await connection.execute(
            `SELECT id, username, name, password, email, role
             FROM registrations
             WHERE id = ? AND status = 'Pending'
             FOR UPDATE`,
            [registrationId]
        );

        if (!registration) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Pending registration not found' });
        }

        const [existingUsers] = await connection.execute(
            `SELECT id
             FROM users
             WHERE username = ? OR email = ?
             LIMIT 1`,
            [registration.username, registration.email]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(409).json({ success: false, message: 'Username or email already exists in users' });
        }

        await connection.execute(
            `INSERT INTO users (username, name, password, email, role, created_at)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [
                registration.username,
                registration.name,
                registration.password,
                registration.email,
                registration.role
            ]
        );

        await connection.execute(
            `DELETE FROM registrations
             WHERE id = ?`,
            [registrationId]
        );

        await connection.commit();
        res.json({ success: true, message: 'Registration accepted' });
    } catch (err) {
        await connection.rollback();
        console.error(err);

        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Username or email already exists' });
        }

        res.status(500).json({ success: false, message: 'Failed to accept registration' });
    } finally {
        connection.release();
    }
};

const rejectRegistration = async (req, res) => {
    const manager = requireManager(req, res);
    if (!manager) return;

    const registrationId = Number(req.params.id);
    if (!Number.isInteger(registrationId) || registrationId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid registration id' });
    }

    try {
        const [result] = await db.execute(
            `DELETE FROM registrations
             WHERE id = ? AND status = 'Pending'`,
            [registrationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Pending registration not found' });
        }

        res.json({ success: true, message: 'Registration deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to delete registration' });
    }
};

const getStaffProfiles = async (req, res) => {
    const manager = requireManager(req, res);
    if (!manager) return;

    try {
        const staffProfiles = await fetchStaffProfiles();
        res.json({
            success: true,
            currentUserId: manager.id,
            staffProfiles
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to load staff profiles' });
    }
};

const updateStaffStatus = async (req, res) => {
    const manager = requireManager(req, res);
    if (!manager) return;

    const staffId = Number(req.params.id);
    const { is_active } = req.body;

    if (!Number.isInteger(staffId) || staffId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid staff id' });
    }

    if (!['active', 'disabled'].includes(is_active)) {
        return res.status(400).json({ success: false, message: 'Invalid account status' });
    }

    if (staffId === manager.id && is_active === 'disabled') {
        return res.status(400).json({ success: false, message: 'You cannot disable your own account' });
    }

    try {
        const [result] = await db.execute(
            `UPDATE users
             SET is_active = ?
             WHERE id = ?`,
            [is_active, staffId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Staff profile not found' });
        }

        res.json({ success: true, message: 'Staff status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to update staff status' });
    }
};

module.exports = {
    getManagerDashboard,
    getRegistrations,
    acceptRegistration,
    rejectRegistration,
    getStaffProfiles,
    updateStaffStatus
};
