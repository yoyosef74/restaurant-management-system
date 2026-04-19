-- ============================================
-- Restaurant Management System - Database Schema
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTH
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- RESTAURANT STRUCTURE
-- ============================================
CREATE TABLE IF NOT EXISTS sections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    table_number VARCHAR(20) UNIQUE NOT NULL,
    section_id INTEGER REFERENCES sections(id),
    capacity INTEGER NOT NULL DEFAULT 4,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','occupied','reserved','cleaning')),
    qr_code VARCHAR(255),
    x_position FLOAT DEFAULT 0,
    y_position FLOAT DEFAULT 0,
    shape VARCHAR(20) DEFAULT 'rectangle' CHECK (shape IN ('rectangle','circle','square')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- MENU
-- ============================================
CREATE TABLE IF NOT EXISTS menu_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES menu_categories(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) DEFAULT 0,
    image_url VARCHAR(500),
    sku VARCHAR(50) UNIQUE,
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    preparation_time INTEGER DEFAULT 15,
    calories INTEGER,
    allergens TEXT[],
    tags TEXT[],
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_item_modifiers (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    options JSONB NOT NULL DEFAULT '[]',
    is_required BOOLEAN DEFAULT FALSE,
    max_selections INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    loyalty_points INTEGER DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    table_id INTEGER REFERENCES tables(id),
    customer_id UUID REFERENCES customers(id),
    waiter_id UUID REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','preparing','ready','served','paid','cancelled','refunded')),
    order_type VARCHAR(20) DEFAULT 'dine-in' CHECK (order_type IN ('dine-in','takeaway','delivery','online')),
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_type VARCHAR(20),
    discount_reason TEXT,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    tax_rate DECIMAL(5,4) DEFAULT 0.08,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    kitchen_notes TEXT,
    estimated_time INTEGER,
    seated_at TIMESTAMP,
    ordered_at TIMESTAMP,
    served_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER REFERENCES menu_items(id),
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    modifiers JSONB DEFAULT '[]',
    special_instructions TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','preparing','ready','served','cancelled')),
    kitchen_station VARCHAR(50),
    prepared_at TIMESTAMP,
    served_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','card','mobile','voucher','split')),
    amount DECIMAL(10,2) NOT NULL,
    tip_amount DECIMAL(10,2) DEFAULT 0,
    change_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
    transaction_id VARCHAR(100),
    card_last_four VARCHAR(4),
    card_type VARCHAR(20),
    notes TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS split_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
    method VARCHAR(30) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed',
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INVENTORY
-- ============================================
CREATE TABLE IF NOT EXISTS inventory_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES inventory_categories(id),
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) UNIQUE,
    description TEXT,
    unit VARCHAR(30) NOT NULL,
    current_stock DECIMAL(10,3) DEFAULT 0,
    minimum_stock DECIMAL(10,3) DEFAULT 0,
    maximum_stock DECIMAL(10,3) DEFAULT 1000,
    reorder_point DECIMAL(10,3) DEFAULT 10,
    cost_per_unit DECIMAL(10,4) DEFAULT 0,
    supplier_id INTEGER,
    location VARCHAR(100),
    expiry_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id INTEGER REFERENCES inventory_items(id),
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('purchase','consumption','waste','adjustment','transfer')),
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,4),
    total_cost DECIMAL(10,2),
    reference_id VARCHAR(100),
    notes TEXT,
    performed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    tax_id VARCHAR(50),
    payment_terms INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE inventory_items ADD CONSTRAINT fk_inventory_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

CREATE TABLE IF NOT EXISTS menu_item_ingredients (
    id SERIAL PRIMARY KEY,
    menu_item_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
    inventory_item_id INTEGER REFERENCES inventory_items(id),
    quantity_used DECIMAL(10,4) NOT NULL,
    unit VARCHAR(30)
);

-- ============================================
-- RESERVATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    table_id INTEGER REFERENCES tables(id),
    party_size INTEGER NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 90,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','seated','completed','cancelled','no-show')),
    special_requests TEXT,
    notes TEXT,
    confirmed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- SYSTEM SETTINGS
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(20) DEFAULT 'string' CHECK (type IN ('string','number','boolean','json')),
    category VARCHAR(50),
    description TEXT,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_table_id ON orders(table_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_status ON order_items(status);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_inventory_items_sku ON inventory_items(sku);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================
-- SEED DATA
-- ============================================

-- Roles
INSERT INTO roles (name, description, permissions) VALUES
('admin', 'System Administrator', '["all"]'),
('manager', 'Restaurant Manager', '["orders","menu","inventory","reports","customers","settings","tables"]'),
('waiter', 'Waiter/Server', '["orders","tables","customers","pos"]'),
('kitchen', 'Kitchen Staff', '["kitchen","orders"]'),
('cashier', 'Cashier', '["pos","payments","orders"]')
ON CONFLICT DO NOTHING;

-- Users (passwords are bcrypt of 'password123')
INSERT INTO users (id, first_name, last_name, email, password_hash, role_id, phone, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'Admin', 'User', 'admin@restaurant.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyYlSF6PGjhvC2', 1, '+1555000001', true),
('00000000-0000-0000-0000-000000000002', 'John', 'Manager', 'manager@restaurant.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyYlSF6PGjhvC2', 2, '+1555000002', true),
('00000000-0000-0000-0000-000000000003', 'Alice', 'Waiter', 'waiter@restaurant.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyYlSF6PGjhvC2', 3, '+1555000003', true),
('00000000-0000-0000-0000-000000000004', 'Bob', 'Chef', 'kitchen@restaurant.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyYlSF6PGjhvC2', 4, '+1555000004', true),
('00000000-0000-0000-0000-000000000005', 'Carol', 'Cashier', 'cashier@restaurant.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewKyYlSF6PGjhvC2', 5, '+1555000005', true)
ON CONFLICT DO NOTHING;

-- Sections
INSERT INTO sections (name, description) VALUES
('Main Hall', 'Main dining area'),
('Terrace', 'Outdoor terrace'),
('Private Room', 'Private dining room'),
('Bar', 'Bar seating area')
ON CONFLICT DO NOTHING;

-- Tables
INSERT INTO tables (table_number, section_id, capacity, status, x_position, y_position, shape) VALUES
('T01', 1, 4, 'available', 10, 10, 'rectangle'),
('T02', 1, 4, 'available', 30, 10, 'rectangle'),
('T03', 1, 6, 'available', 50, 10, 'rectangle'),
('T04', 1, 2, 'available', 70, 10, 'circle'),
('T05', 1, 4, 'available', 10, 40, 'rectangle'),
('T06', 1, 8, 'available', 30, 40, 'rectangle'),
('T07', 1, 4, 'available', 60, 40, 'rectangle'),
('T08', 2, 4, 'available', 10, 10, 'circle'),
('T09', 2, 4, 'available', 30, 10, 'circle'),
('T10', 2, 6, 'available', 50, 10, 'rectangle'),
('B01', 4, 2, 'available', 10, 10, 'square'),
('B02', 4, 2, 'available', 25, 10, 'square'),
('P01', 3, 12, 'available', 10, 10, 'rectangle')
ON CONFLICT DO NOTHING;

-- Menu Categories
INSERT INTO menu_categories (name, description, sort_order) VALUES
('Appetizers', 'Start your meal right', 1),
('Soups & Salads', 'Fresh and healthy options', 2),
('Pasta', 'Handmade Italian pasta', 3),
('Main Course', 'Signature main dishes', 4),
('Seafood', 'Fresh daily catch', 5),
('Pizza', 'Wood-fired pizzas', 6),
('Desserts', 'Sweet endings', 7),
('Beverages', 'Drinks and cocktails', 8),
('Sides', 'Perfect accompaniments', 9)
ON CONFLICT DO NOTHING;

-- Menu Items
INSERT INTO menu_items (category_id, name, description, price, cost, sku, preparation_time, calories, tags) VALUES
-- Appetizers
(1, 'Bruschetta al Pomodoro', 'Toasted bread with fresh tomatoes, basil and garlic', 9.50, 2.50, 'APP001', 8, 180, ARRAY['vegetarian','popular']),
(1, 'Calamari Fritti', 'Crispy fried calamari with marinara sauce', 14.00, 4.00, 'APP002', 12, 320, ARRAY['seafood']),
(1, 'Antipasto Misto', 'Selection of Italian cured meats and cheeses', 18.00, 6.00, 'APP003', 5, 450, ARRAY['popular']),
(1, 'Burrata con Prosciutto', 'Fresh burrata with prosciutto crudo and arugula', 16.00, 5.50, 'APP004', 5, 380, ARRAY['featured']),
-- Soups & Salads
(2, 'Minestrone Soup', 'Classic Italian vegetable soup', 10.00, 2.00, 'SAL001', 5, 220, ARRAY['vegetarian','vegan']),
(2, 'Caesar Salad', 'Romaine lettuce, parmesan, croutons, caesar dressing', 13.00, 3.00, 'SAL002', 8, 310, ARRAY['popular']),
(2, 'Caprese Salad', 'Buffalo mozzarella, heirloom tomatoes, fresh basil', 14.00, 4.00, 'SAL003', 5, 280, ARRAY['vegetarian','featured']),
(2, 'Arugula & Pear Salad', 'Baby arugula, bosc pear, gorgonzola, walnuts', 13.50, 3.50, 'SAL004', 5, 320, ARRAY['vegetarian']),
-- Pasta
(3, 'Spaghetti Carbonara', 'Eggs, guanciale, pecorino romano, black pepper', 19.00, 5.00, 'PAS001', 15, 680, ARRAY['popular','featured']),
(3, 'Fettuccine Alfredo', 'Homemade fettuccine with butter and parmesan', 18.00, 4.50, 'PAS002', 15, 720, ARRAY['vegetarian']),
(3, 'Penne Arrabbiata', 'Penne with spicy tomato sauce and garlic', 16.00, 3.50, 'PAS003', 15, 580, ARRAY['vegetarian','vegan','spicy']),
(3, 'Tagliatelle al Ragu', 'Slow-cooked Bolognese with fresh tagliatelle', 22.00, 6.50, 'PAS004', 15, 780, ARRAY['popular']),
(3, 'Risotto ai Funghi', 'Creamy Arborio rice with wild mushrooms and truffle', 24.00, 7.00, 'PAS005', 25, 650, ARRAY['vegetarian','featured']),
-- Main Course
(4, 'Osso Buco Milanese', 'Braised veal shanks with gremolata and saffron risotto', 38.00, 14.00, 'MAI001', 30, 780, ARRAY['featured','popular']),
(4, 'Pollo alla Parmigiana', 'Breaded chicken breast with tomato sauce and mozzarella', 26.00, 8.00, 'MAI002', 20, 650, ARRAY['popular']),
(4, 'Bistecca Fiorentina', '28oz T-bone Florentine steak with rosemary potatoes', 65.00, 28.00, 'MAI003', 25, 1200, ARRAY['featured']),
(4, 'Agnello al Forno', 'Slow-roasted lamb chops with herbs and vegetables', 42.00, 16.00, 'MAI004', 35, 890, ARRAY['featured']),
-- Seafood
(5, 'Branzino al Forno', 'Whole roasted sea bass with lemon and capers', 36.00, 15.00, 'SEA001', 25, 480, ARRAY['seafood','healthy']),
(5, 'Salmone Grigliato', 'Grilled Atlantic salmon with asparagus and lemon butter', 32.00, 13.00, 'SEA002', 20, 520, ARRAY['seafood','healthy','popular']),
(5, 'Gamberi alla Busara', 'King prawns in spicy tomato sauce', 34.00, 14.00, 'SEA003', 18, 420, ARRAY['seafood','spicy']),
-- Pizza
(6, 'Pizza Margherita', 'San Marzano tomato, fior di latte, fresh basil', 17.00, 4.00, 'PIZ001', 18, 680, ARRAY['vegetarian','popular']),
(6, 'Pizza Diavola', 'Spicy salami, fresh chili, olives', 20.00, 5.50, 'PIZ002', 18, 780, ARRAY['spicy','popular']),
(6, 'Pizza Quattro Stagioni', 'Ham, mushrooms, artichokes, olives, tomato', 21.00, 5.50, 'PIZ003', 18, 760, ARRAY['popular']),
(6, 'Pizza Tartufo', 'Truffle cream, mushrooms, parmesan, arugula', 26.00, 8.00, 'PIZ004', 18, 720, ARRAY['vegetarian','featured']),
-- Desserts
(7, 'Tiramisu Classico', 'Classic tiramisu with espresso and mascarpone', 9.00, 2.50, 'DES001', 3, 480, ARRAY['popular','featured']),
(7, 'Panna Cotta', 'Vanilla panna cotta with berry coulis', 8.00, 2.00, 'DES002', 3, 320, ARRAY['vegetarian']),
(7, 'Cannoli Siciliani', 'Crispy shells with ricotta cream and pistachios', 8.50, 2.50, 'DES003', 3, 420, ARRAY['popular']),
(7, 'Gelato della Casa', 'Three scoops of house-made gelato', 7.50, 2.00, 'DES004', 3, 380, ARRAY['vegetarian']),
-- Beverages
(8, 'Espresso', 'Single shot Italian espresso', 3.50, 0.50, 'BEV001', 2, 5, ARRAY['hot','coffee']),
(8, 'Cappuccino', 'Espresso with steamed milk foam', 5.00, 1.00, 'BEV002', 3, 80, ARRAY['hot','coffee','popular']),
(8, 'Still Water 750ml', 'San Pellegrino still water', 4.00, 1.00, 'BEV003', 1, 0, ARRAY['non-alcoholic']),
(8, 'Sparkling Water 750ml', 'San Pellegrino sparkling water', 4.00, 1.00, 'BEV004', 1, 0, ARRAY['non-alcoholic']),
(8, 'House Red Wine (Glass)', 'Italian Chianti Classico', 12.00, 4.00, 'BEV005', 1, 125, ARRAY['alcohol','wine']),
(8, 'House White Wine (Glass)', 'Pinot Grigio delle Venezie', 11.00, 3.50, 'BEV006', 1, 120, ARRAY['alcohol','wine']),
(8, 'Aperol Spritz', 'Aperol, prosecco, soda, orange', 13.00, 4.00, 'BEV007', 3, 180, ARRAY['alcohol','cocktail','popular']),
(8, 'Limoncello', 'House-made lemon liqueur', 8.00, 2.00, 'BEV008', 1, 150, ARRAY['alcohol']),
-- Sides
(9, 'Truffle Fries', 'Crispy fries with truffle oil and parmesan', 8.00, 2.00, 'SID001', 10, 380, ARRAY['vegetarian','popular']),
(9, 'Roasted Vegetables', 'Seasonal vegetables with olive oil and herbs', 7.00, 2.00, 'SID002', 15, 180, ARRAY['vegetarian','vegan','healthy']),
(9, 'Garlic Bread', 'Toasted ciabatta with garlic butter', 5.00, 1.00, 'SID003', 8, 280, ARRAY['vegetarian','popular'])
ON CONFLICT DO NOTHING;

-- Inventory Categories
INSERT INTO inventory_categories (name) VALUES
('Produce'), ('Meat & Poultry'), ('Seafood'), ('Dairy'), ('Dry Goods'), ('Beverages'), ('Cleaning Supplies')
ON CONFLICT DO NOTHING;

-- Inventory Items
INSERT INTO inventory_items (category_id, name, sku, unit, current_stock, minimum_stock, reorder_point, cost_per_unit) VALUES
(1, 'Tomatoes', 'INV001', 'kg', 25.5, 5, 10, 2.50),
(1, 'Fresh Basil', 'INV002', 'bunch', 15, 3, 5, 1.50),
(1, 'Garlic', 'INV003', 'kg', 8, 2, 4, 3.00),
(1, 'Onions', 'INV004', 'kg', 20, 5, 8, 1.50),
(1, 'Arugula', 'INV005', 'kg', 5, 1, 2, 8.00),
(1, 'Romaine Lettuce', 'INV006', 'head', 20, 5, 8, 2.00),
(2, 'Chicken Breast', 'INV010', 'kg', 18, 5, 10, 8.50),
(2, 'Beef T-bone', 'INV011', 'kg', 12, 3, 6, 35.00),
(2, 'Veal Shanks', 'INV012', 'kg', 8, 2, 4, 22.00),
(2, 'Lamb Chops', 'INV013', 'kg', 6, 2, 4, 28.00),
(2, 'Guanciale', 'INV014', 'kg', 4, 1, 2, 18.00),
(3, 'Sea Bass', 'INV020', 'kg', 10, 3, 5, 24.00),
(3, 'Salmon Fillet', 'INV021', 'kg', 12, 4, 6, 20.00),
(3, 'King Prawns', 'INV022', 'kg', 8, 2, 4, 28.00),
(3, 'Calamari', 'INV023', 'kg', 6, 2, 3, 14.00),
(4, 'Mozzarella', 'INV030', 'kg', 15, 3, 6, 12.00),
(4, 'Parmesan', 'INV031', 'kg', 8, 2, 4, 22.00),
(4, 'Burrata', 'INV032', 'piece', 20, 5, 8, 4.50),
(4, 'Heavy Cream', 'INV033', 'L', 10, 2, 4, 4.00),
(4, 'Eggs', 'INV034', 'dozen', 10, 2, 4, 4.50),
(5, 'Spaghetti', 'INV040', 'kg', 20, 5, 8, 3.00),
(5, 'Penne', 'INV041', 'kg', 15, 5, 8, 3.00),
(5, 'Arborio Rice', 'INV042', 'kg', 10, 3, 5, 4.50),
(5, 'Flour 00', 'INV043', 'kg', 30, 10, 15, 2.00),
(5, 'Olive Oil Extra Virgin', 'INV044', 'L', 20, 5, 8, 12.00),
(6, 'Espresso Beans', 'INV050', 'kg', 10, 2, 4, 22.00),
(6, 'Sparkling Water 750ml', 'INV051', 'bottle', 60, 20, 30, 1.20),
(6, 'Still Water 750ml', 'INV052', 'bottle', 60, 20, 30, 1.20),
(6, 'Chianti Wine', 'INV053', 'bottle', 24, 6, 12, 18.00),
(6, 'Pinot Grigio', 'INV054', 'bottle', 24, 6, 12, 15.00)
ON CONFLICT DO NOTHING;

-- Customers
INSERT INTO customers (id, first_name, last_name, email, phone, loyalty_points, total_visits, total_spent) VALUES
('10000000-0000-0000-0000-000000000001', 'Marco', 'Rossi', 'marco.rossi@email.com', '+1555111001', 350, 12, 892.50),
('10000000-0000-0000-0000-000000000002', 'Sofia', 'Bianchi', 'sofia.bianchi@email.com', '+1555111002', 180, 6, 445.00),
('10000000-0000-0000-0000-000000000003', 'James', 'Wilson', 'james.wilson@email.com', '+1555111003', 520, 18, 1340.00),
('10000000-0000-0000-0000-000000000004', 'Emma', 'Johnson', 'emma.johnson@email.com', '+1555111004', 95, 3, 238.50),
('10000000-0000-0000-0000-000000000005', 'Luca', 'Ferrari', 'luca.ferrari@email.com', '+1555111005', 780, 25, 2150.00)
ON CONFLICT DO NOTHING;

-- Settings
INSERT INTO settings (key, value, type, category, description) VALUES
('restaurant_name', 'La Bella Cucina', 'string', 'general', 'Restaurant name'),
('restaurant_address', '123 Main Street, New York, NY 10001', 'string', 'general', 'Restaurant address'),
('restaurant_phone', '+1 (555) 123-4567', 'string', 'general', 'Restaurant phone'),
('restaurant_email', 'info@labelacucina.com', 'string', 'general', 'Restaurant email'),
('tax_rate', '0.08', 'number', 'billing', 'Tax rate (0.08 = 8%)'),
('currency', 'USD', 'string', 'billing', 'Currency code'),
('currency_symbol', '$', 'string', 'billing', 'Currency symbol'),
('tip_suggestions', '[15, 18, 20, 25]', 'json', 'billing', 'Tip percentage suggestions'),
('kitchen_display_refresh', '5', 'number', 'kitchen', 'Kitchen display refresh interval in seconds'),
('order_number_prefix', 'ORD', 'string', 'orders', 'Order number prefix'),
('reservation_duration', '90', 'number', 'reservations', 'Default reservation duration in minutes'),
('loyalty_points_rate', '1', 'number', 'loyalty', 'Points earned per dollar spent'),
('receipt_footer', 'Thank you for dining with us!', 'string', 'billing', 'Receipt footer message'),
('opening_time', '11:00', 'string', 'general', 'Opening time'),
('closing_time', '23:00', 'string', 'general', 'Closing time')
ON CONFLICT DO NOTHING;

-- Sample recent orders
INSERT INTO orders (id, order_number, table_id, waiter_id, status, order_type, subtotal, tax_amount, total_amount, ordered_at, paid_at) VALUES
('20000000-0000-0000-0000-000000000001', 'ORD-2024-0001', 1, '00000000-0000-0000-0000-000000000003', 'paid', 'dine-in', 89.00, 7.12, 96.12, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes'),
('20000000-0000-0000-0000-000000000002', 'ORD-2024-0002', 3, '00000000-0000-0000-0000-000000000003', 'serving', 'dine-in', 65.50, 5.24, 70.74, NOW() - INTERVAL '1 hour', NULL),
('20000000-0000-0000-0000-000000000003', 'ORD-2024-0003', 5, '00000000-0000-0000-0000-000000000003', 'preparing', 'dine-in', 112.00, 8.96, 120.96, NOW() - INTERVAL '30 minutes', NULL)
ON CONFLICT DO NOTHING;

-- View for order summary
CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.id,
    o.order_number,
    o.status,
    o.order_type,
    t.table_number,
    u.first_name || ' ' || u.last_name AS waiter_name,
    o.subtotal,
    o.tax_amount,
    o.tip_amount,
    o.total_amount,
    o.ordered_at,
    o.paid_at,
    COUNT(oi.id) AS item_count
FROM orders o
LEFT JOIN tables t ON o.table_id = t.id
LEFT JOIN users u ON o.waiter_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, t.table_number, u.first_name, u.last_name;

-- View for daily sales
CREATE OR REPLACE VIEW daily_sales AS
SELECT 
    DATE(created_at) AS sale_date,
    COUNT(*) AS total_orders,
    SUM(subtotal) AS total_subtotal,
    SUM(tax_amount) AS total_tax,
    SUM(tip_amount) AS total_tips,
    SUM(total_amount) AS total_revenue
FROM orders
WHERE status = 'paid'
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

COMMIT;
