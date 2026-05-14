SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- users: staff accounts
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `username`   VARCHAR(128) NOT NULL,
  `name`       VARCHAR(128) NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `email`      VARCHAR(128) NOT NULL,
  `role`       ENUM('Cashier','Manager','Kitchen') DEFAULT 'Cashier',
  `is_active`  ENUM('active','disabled') DEFAULT 'active',
  `created_at` TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email`    (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- registrations: pending account requests awaiting approval
CREATE TABLE IF NOT EXISTS `registrations` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `username`     VARCHAR(128) NOT NULL,
  `name`         VARCHAR(128) NOT NULL,
  `password`     VARCHAR(255) NOT NULL,
  `email`        VARCHAR(128) NOT NULL,
  `role`         ENUM('Cashier') NOT NULL DEFAULT 'Cashier',
  `status`       ENUM('Pending','Accepted','Rejected') NOT NULL DEFAULT 'Pending',
  `submitted_at` TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_reg_username` (`username`),
  UNIQUE KEY `uq_reg_email`    (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- user_sessions: tracks login/logout times per user
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id`            INT       NOT NULL AUTO_INCREMENT,
  `user_id`       INT       NOT NULL,
  `logged_in_at`  TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `logged_out_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sessions_user` (`user_id`),
  CONSTRAINT `fk_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- categories: product groupings (e.g. Coffee, Food)
CREATE TABLE IF NOT EXISTS `categories` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(50)  NOT NULL,
  `icon`       VARCHAR(100) DEFAULT NULL,
  `created_at` TIMESTAMP    NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- products: menu items
CREATE TABLE IF NOT EXISTS `products` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `category_id`  INT           NOT NULL,
  `name`         VARCHAR(100)  NOT NULL,
  `description`  TEXT,
  `base_price`   DECIMAL(10,2) NOT NULL,
  `image_url`    VARCHAR(255)  DEFAULT NULL,
  `is_available` TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`   TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_category`  (`category_id`),
  KEY `idx_products_available` (`is_available`),
  CONSTRAINT `fk_products_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- product_sizes: size variants with their own price
CREATE TABLE IF NOT EXISTS `product_sizes` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `product_id` INT           NOT NULL,
  `label`      VARCHAR(20)   NOT NULL,
  `price`      DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_sizes_product` (`product_id`),
  CONSTRAINT `fk_sizes_product`
    FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- product_addons: optional extras per product
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- orders: customer transactions
CREATE TABLE IF NOT EXISTS `orders` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `cashier_id`      INT           NOT NULL,
  `session_id`      INT           NOT NULL,
  `status`          ENUM('pending','held','completed','voided','refunded') NOT NULL DEFAULT 'pending',
  `subtotal`        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `tax_amount`      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total`           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `payment_method`  ENUM('cash','card','gcash') DEFAULT NULL,
  `notes`           TEXT,
  `created_at`      TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at`    TIMESTAMP     NULL DEFAULT NULL,
  `completed_by`    INT           DEFAULT NULL,
  `voided_at`       TIMESTAMP     NULL DEFAULT NULL,
  `refunded_at`     TIMESTAMP     NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_orders_status`  (`status`),
  KEY `idx_orders_cashier` (`cashier_id`),
  KEY `idx_orders_completed_by` (`completed_by`),
  KEY `idx_orders_session` (`session_id`),
  KEY `idx_orders_created` (`created_at`),
  CONSTRAINT `fk_orders_cashier`
    FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_orders_completed_by`
    FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_orders_session`
    FOREIGN KEY (`session_id`) REFERENCES `user_sessions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- order_items: line items; snapshots product name/price at time of sale
CREATE TABLE IF NOT EXISTS `order_items` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `order_id`        INT           NOT NULL,
  `product_id`      INT           NOT NULL,
  `product_name`    VARCHAR(100)  NOT NULL,
  `product_size_id` INT           DEFAULT NULL,
  `size_label`      VARCHAR(20)   DEFAULT NULL,
  `quantity`        INT           NOT NULL DEFAULT 1,
  `unit_price`      DECIMAL(10,2) NOT NULL,
  `line_subtotal`   DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `fk_items_product`      (`product_id`),
  KEY `fk_items_size`         (`product_size_id`),
  CONSTRAINT `fk_items_order`
    FOREIGN KEY (`order_id`)        REFERENCES `orders` (`id`),
  CONSTRAINT `fk_items_product`
    FOREIGN KEY (`product_id`)      REFERENCES `products` (`id`),
  CONSTRAINT `fk_items_size`
    FOREIGN KEY (`product_size_id`) REFERENCES `product_sizes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- order_item_addons: add-ons applied to a specific line item
CREATE TABLE IF NOT EXISTS `order_item_addons` (
  `id`             INT           NOT NULL AUTO_INCREMENT,
  `order_item_id`  INT           NOT NULL,
  `addon_id`       INT           NOT NULL,
  `addon_name`     VARCHAR(100)  NOT NULL,
  `quantity`       INT           NOT NULL DEFAULT 1,
  `addon_price`    DECIMAL(10,2) NOT NULL,
  `addon_subtotal` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `fk_oia_item`  (`order_item_id`),
  KEY `fk_oia_addon` (`addon_id`),
  CONSTRAINT `fk_oia_item`
    FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`),
  CONSTRAINT `fk_oia_addon`
    FOREIGN KEY (`addon_id`)      REFERENCES `product_addons` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- payments: payment record per order
CREATE TABLE IF NOT EXISTS `payments` (
  `id`              INT           NOT NULL AUTO_INCREMENT,
  `order_id`        INT           NOT NULL,
  `payment_method`  ENUM('cash','card','gcash') NOT NULL,
  `amount_due`      DECIMAL(10,2) NOT NULL,
  `amount_received` DECIMAL(10,2) NOT NULL,
  `change_due`      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `reference_no`    VARCHAR(100)  DEFAULT NULL,
  `paid_at`         TIMESTAMP     NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payments_order`  (`order_id`),
  KEY `idx_payments_method` (`payment_method`),
  KEY `idx_payments_paid`   (`paid_at`),
  CONSTRAINT `fk_payments_order`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
