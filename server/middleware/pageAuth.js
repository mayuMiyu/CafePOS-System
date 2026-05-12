const path = require('path');

function redirectByRole(user, res) {
    if (user?.role === 'Manager') {
        return res.redirect('/manager.html');
    }

    if (user?.role === 'Cashier') {
        return res.redirect('/cashier.html');
    }

    return res.redirect('/');
}

function requirePageRole(role, fileName) {
    return (req, res) => {
        const user = req.session?.user;

        if (!user) {
            return res.redirect('/');
        }

        if (user.role !== role) {
            return redirectByRole(user, res);
        }

        return res.sendFile(path.join(__dirname, '../../ui/models', fileName));
    };
}

module.exports = { requirePageRole };
