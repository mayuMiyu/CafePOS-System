const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const productRoute = require ('./routes/productroute');
const orderRoutes = require('./routes/orderroutes');
const managerRoutes = require('./routes/managerroutes');
const { requirePageRole } = require('./middleware/pageAuth');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use('/api', authRoutes);
app.use('/api', productRoute);
app.use('/api', orderRoutes);
app.use('/api', managerRoutes);
app.get('/cashier.html', requirePageRole('Cashier', 'cashier.html'));
app.get('/profile.html', requirePageRole('Cashier', 'profile.html'));
app.get('/manager.html', requirePageRole('Manager', 'manager.html'));
app.use(express.static(path.join(__dirname, '../ui/models'), {
    index: false,
    extensions: false
}));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../ui/models/login.html'));
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});
