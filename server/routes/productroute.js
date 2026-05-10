const express = require('express');
const router = express.Router();
const { getProducts } = require('../controller/productController');

router.get('/products', getProducts);

const upload = require('../controller/uploadController');
const db = require('../config/database');
// Upload image and update product
router.post('/products/:id/image', upload.single('image'), async (req, res) => {
    console.log('Upload route hit, id:', req.params.id);
    console.log('File:', req.file);
    try {
        const imageUrl = `/assets/products/${req.file.filename}`;
        await db.execute('UPDATE products SET image_url = ? WHERE id = ?', [imageUrl, req.params.id]);
        res.json({ success: true, image_url: imageUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Upload failed' });
    }
});

module.exports = router;