-- =============================================================
-- cafeweb database schema
-- Engine: MySQL 9.x | Charset: utf8mb4
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------------
-- categories
-- Lookup table for menu groupings (Coffee, Food, Dessert, etc.)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `categories` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(50)  NOT NULL,
  `icon`       VARCHAR(100)     NULL,
  `created_at` TIMESTAMP        NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- products
-- Menu items, each belonging to one category.
-- is_available controls POS visibility.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `products` (
  `id`           INT            NOT NULL AUTO_INCREMENT,
  `category_id`  INT            NOT NULL,
  `name`         VARCHAR(100)   NOT NULL,
  `description`  TEXT               NULL,
  `base_price`   DECIMAL(10,2)  NOT NULL,
  `image_url`    VARCHAR(255)       NULL,
  `is_available` TINYINT(1)     NOT NULL DEFAULT 1,
  `created_at`   TIMESTAMP          NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_category`  (`category_id`),
  KEY `idx_products_available` (`is_available`),
  CONSTRAINT `fk_products_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- product_sizes
-- Optional size variants per product with individual pricing.
-- If a product has no sizes, base_price on products is used.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_sizes` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `product_id` INT           NOT NULL,
  `label`      VARCHAR(20)   NOT NULL,   -- e.g. Small, Medium, Large
  `price`      DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sizes_product` (`product_id`),
  CONSTRAINT `fk_sizes_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- product_addons
-- Optional paid add-ons available per product (e.g. Extra Shot).
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `product_addons` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `product_id`   INT           NOT NULL,
  `name`         VARCHAR(100)  NOT NULL,
  `extra_price`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `is_available` TINYINT(1)    NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `fk_addons_product` (`product_id`),
  CONSTRAINT `fk_addons_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- users
-- Staff accounts. Roles: Cashier, Manager, Kitchen.
-- Passwords stored as bcrypt hashes.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(128) NOT NULL,
  `name`       VARCHAR(128) NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `email`      VARCHAR(128) NOT NULL,
  `role`       ENUM('Cashier','Manager','Kitchen') DEFAULT 'Cashier',
  `is_active`  ENUM('active','disabled')           DEFAULT 'active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email`    (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- registrations
-- Self-service cashier signup requests pending manager approval.
-- Does NOT share rows with users; approved rows are copied over.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `registrations` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `username`     VARCHAR(128) NOT NULL,
  `name`         VARCHAR(128) NOT NULL,
  `password`     VARCHAR(255) NOT NULL,
  `email`        VARCHAR(128) NOT NULL,
  `role`         ENUM('Cashier')                           NOT NULL DEFAULT 'Cashier',
  `status`       ENUM('Pending','Accepted','Rejected')     NOT NULL DEFAULT 'Pending',
  `submitted_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reg_username` (`username`),
  UNIQUE KEY `uq_reg_email`    (`email`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4;
-- Note: MyISAM used here; FK constraints not enforced on this table.

-- -------------------------------------------------------------
-- user_sessions
-- Tracks login/logout timestamps per user for audit purposes.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id`            INT       NOT NULL AUTO_INCREMENT,
  `user_id`       INT       NOT NULL,
  `logged_in_at`  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `logged_out_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sessions_user` (`user_id`),
  CONSTRAINT `fk_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- orders
-- One row per transaction. Totals are stored for historical
-- accuracy even if product prices change later.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `orders` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `cashier_id`      INT           NOT NULL,
  `session_id`      INT           NOT NULL,           -- references user_sessions.id (no FK enforced)
  `status`          ENUM('pending','held','completed','voided','refunded')
                                  NOT NULL DEFAULT 'pending',
  `subtotal`        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax_amount`      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total`           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method`  ENUM('cash','card','gcash')    NULL,
  `notes`           TEXT                           NULL,
  `created_at`      TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at`    TIMESTAMP NULL DEFAULT NULL,
  `completed_by`    INT           NULL,               -- user who completed (if different from cashier)
  `voided_at`       TIMESTAMP NULL DEFAULT NULL,
  `refunded_at`     TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_orders_status`       (`status`),
  KEY `idx_orders_cashier`      (`cashier_id`),
  KEY `idx_orders_session`      (`session_id`),
  KEY `idx_orders_created`      (`created_at`),
  KEY `idx_orders_completed_by` (`completed_by`),
  CONSTRAINT `fk_orders_cashier`
    FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- order_items
-- Line items per order. Product name and size are denormalized
-- so receipts remain accurate after menu changes.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_items` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `order_id`        INT           NOT NULL,
  `product_id`      INT           NOT NULL,
  `product_name`    VARCHAR(100)  NOT NULL,   -- snapshot at time of order
  `product_size_id` INT               NULL,
  `size_label`      VARCHAR(20)       NULL,   -- snapshot at time of order
  `quantity`        INT           NOT NULL DEFAULT 1,
  `unit_price`      DECIMAL(10,2) NOT NULL,
  `line_subtotal`   DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order`  (`order_id`),
  KEY `fk_items_product`       (`product_id`),
  KEY `fk_items_size`          (`product_size_id`),
  CONSTRAINT `fk_items_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_items_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_items_size`
    FOREIGN KEY (`product_size_id`) REFERENCES `product_sizes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- order_item_addons
-- Add-ons selected for a specific order line item.
-- addon_name is denormalized for receipt accuracy.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `order_item_addons` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `order_item_id`  INT           NOT NULL,
  `addon_id`       INT           NOT NULL,
  `addon_name`     VARCHAR(100)  NOT NULL,   -- snapshot at time of order
  `quantity`       INT           NOT NULL DEFAULT 1,
  `addon_price`    DECIMAL(10,2) NOT NULL,
  `addon_subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `fk_addon_item`  (`order_item_id`),
  KEY `fk_addon_ref`   (`addon_id`),
  CONSTRAINT `fk_addon_item`
    FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`),
  CONSTRAINT `fk_addon_ref`
    FOREIGN KEY (`addon_id`) REFERENCES `product_addons` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------------
-- payments
-- One payment record per completed order.
-- reference_no used for GCash/card transaction IDs.
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `order_id`        INT           NOT NULL,
  `payment_method`  ENUM('cash','card','gcash') NOT NULL,
  `amount_due`      DECIMAL(10,2) NOT NULL,
  `amount_received` DECIMAL(10,2) NOT NULL,
  `change_due`      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `reference_no`    VARCHAR(100)      NULL,
  `paid_at`         TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payments_order`  (`order_id`),
  KEY `idx_payments_method` (`payment_method`),
  KEY `idx_payments_paid`   (`paid_at`),
  CONSTRAINT `fk_payments_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
