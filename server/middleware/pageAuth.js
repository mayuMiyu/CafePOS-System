const path = require('path');

function redirectByRole(user, res) {
    if (user?.role === 'Manager') {
        return res.redirect('/manager.html');
    }

    if (user?.role === 'Cashier') {
        return res.redirect('/cashier.html');
    }

    if (user?.role === 'Kitchen') {
        return res.redirect('/kitchen.html');
    }

    return res.redirect('/');
}

function requirePageRole(roles, fileName) {
    return (req, res) => {
        const user = req.session?.user;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!user) {
            return res.redirect('/');
        }

        if (!allowedRoles.includes(user.role)) {
            return redirectByRole(user, res);
        }

        return res.sendFile(path.join(__dirname, '../../ui/models', fileName));
    };
}

module.exports = { requirePageRole };
