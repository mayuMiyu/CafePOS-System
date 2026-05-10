const productGrid = document.getElementById('product-grid');
const itemsCount = document.getElementById('items-count');
const productCategoryButtons = document.querySelectorAll('.category-btn, .category-all-btn');

let products = [];
let activeCategory = 'all';

const categoryFallbackImages = {
    1: '../models/assets/icons8-cafe-96.png',
    2: '../models/assets/icons8-greek-salad-64.png',
    3: '../models/assets/icons8-cherry-cheesecake-64.png',
    4: '../models/assets/icons8-kawaii-soda-64.png'
};

function formatPeso(value) {
    return `₱${Number(value).toLocaleString('en-PH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    })}`;
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function getVisibleProducts() {
    if (activeCategory === 'all') return products;
    return products.filter(product => String(product.category_id) === activeCategory);
}

function updateItemsCount(visibleProducts) {
    const count = visibleProducts.length;
    itemsCount.textContent = `Showing ${count} ${count === 1 ? 'item' : 'items'}`;
}

function updateProductBadges() {
    const counts = { all: products.length };

    products.forEach(product => {
        counts[product.category_id] = (counts[product.category_id] || 0) + 1;
    });

    document.getElementById('badge-all').textContent = counts.all ?? 0;

    [1, 2, 3, 4].forEach(id => {
        const badge = document.getElementById(`badge-${id}`);
        if (badge) badge.textContent = counts[id] ?? 0;
    });
}

function renderProducts() {
    const visibleProducts = getVisibleProducts();
    updateItemsCount(visibleProducts);

    productGrid.innerHTML = visibleProducts.map(product => {
        const imgSrc = product.image_url 
        ? `http://localhost:3000${product.image_url}` 
        : '../models/assets/placeholder.png';

        return `
            <article class="product-card" data-product-id="${product.id}">
                <div class="product-image-wrap"> <img class="product-image" src="${imgSrc}" alt="${product.name}"> </div>
                <div class="product-info">
                    <h3>${escapeHtml(product.name)}</h3>
                    <p>${escapeHtml(product.description)}</p>

                    <div class="product-footer">
                        <span class="product-price">${formatPeso(product.base_price)}</span>
                        <button type="button" class="add-product-btn" aria-label="Add ${escapeHtml(product.name)}">
                            <img src="../models/assets/icons8-note-48.svg" alt="">
                        </button>
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

function bindCategoryFilters() {
    productCategoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            activeCategory = button.dataset.category;
            renderProducts();
        });
    });
}

async function loadProducts() {
    try {
        const res = await fetch('http://localhost:3000/api/products');
        const data = await res.json();

        if (!data.success) return;

        products = data.products;
        updateProductBadges();
        renderProducts();
        bindCategoryFilters();
    } catch (err) {
        console.error('Failed to load products:', err);
        updateItemsCount([]);
    }
}

loadProducts();
