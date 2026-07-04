import { db } from './index';

export const initializeDatabase = async (): Promise<void> => {
  const query = `
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      sku VARCHAR(100) UNIQUE,
      barcode VARCHAR(100) UNIQUE,
      price NUMERIC(10,2) NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255),
      phone_number VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) NOT NULL DEFAULT 'cashier',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sales (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      total_amount NUMERIC(10,2) NOT NULL,
      payment_method VARCHAR(50) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id SERIAL PRIMARY KEY,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL,
      unit_price NUMERIC(10,2) NOT NULL,
      line_total NUMERIC(10,2) NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_barcode
      ON products(barcode);

    CREATE INDEX IF NOT EXISTS idx_products_sku
      ON products(sku);

    CREATE INDEX IF NOT EXISTS idx_sales_created_at
      ON sales(created_at);

    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id
      ON sale_items(sale_id);
  `;

  try {
    console.log('🔄 Ensuring database schema exists...');
    await db.query(query);
    console.log('🟢 Database schema verified successfully.');
  } catch (error) {
    console.error('🔴 Failed to initialize database schema:', error);
    throw error;
  }
};