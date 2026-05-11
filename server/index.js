const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const productRoute = require ('./routes/productroute');
const orderRoutes = require('./routes/orderroutes');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../ui/models')));
app.use('/assets', express.static(path.join(__dirname, '../ui/models/assets')));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use('/api', authRoutes);
app.use('/api', productRoute);
app.use('/api', orderRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../ui/models/login.html'));
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${process.env.PORT || 3000}`);
});
