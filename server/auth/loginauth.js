const bcrypt = require('bcrypt');
const db = require('../config/database');

const login = async (req, res) => {
    const {username, password} = req.body;

    try {
        const [rows] = await db.execute('SELECT * FROM USERS WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status (401).json({ success: false, message: 'Invalid Username' })
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status (401).json ({ success: false, message: 'Invalid username or Password' });
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        res.json({ success: true, role: user.role })
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: 'Server Error' })
    }
};

module.exports = { login }