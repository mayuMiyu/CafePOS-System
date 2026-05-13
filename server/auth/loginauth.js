const bcrypt = require('bcrypt');
const db = require('../config/database');

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    try {
        const [rows] = await db.execute(
            `SELECT id, username, name, password, email, role, is_active
             FROM users
             WHERE username = ?
             LIMIT 1`,
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const user = rows[0];

        if (user.is_active === 'disabled') {
            return res.status(403).json({ success: false, message: 'This account is disabled' });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ success: false, message: 'Invalid username or password' });
        }

        const [sessionResult] = await db.execute(
            'INSERT INTO user_sessions (user_id, logged_in_at) VALUES (?, NOW())',
            [user.id]
        );

        req.session.user = {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            sessionId: sessionResult.insertId
        };

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const logout = async (req, res) => {
    const sessionId = req.session?.user?.sessionId;

    try {
        if (sessionId) {
            await db.execute(
                `UPDATE user_sessions
                 SET logged_out_at = NOW()
                 WHERE id = ? AND logged_out_at IS NULL`,
                [sessionId]
            );
        }

        req.session.destroy(err => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Failed to logout' });
            }

            res.clearCookie('connect.sid');
            res.json({ success: true });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Failed to logout' });
    }
};

const getCurrentUser = (req, res) => {
    if (!req.session?.user?.id) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    res.json({
        success: true,
        user: {
            id: req.session.user.id,
            username: req.session.user.username,
            name: req.session.user.name,
            role: req.session.user.role
        }
    });
};

module.exports = { login, logout, getCurrentUser };
