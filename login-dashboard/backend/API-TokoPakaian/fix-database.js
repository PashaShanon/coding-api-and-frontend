const pool = require('./database/pool');

const createTablesQuery = `
  -- Tabel Categories (Jika belum ada)
  CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabel Products (Jika belum ada)
  CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15, 2) NOT NULL,
    cost DECIMAL(15, 2),
    stock INTEGER DEFAULT 0,
    sku VARCHAR(50) UNIQUE,
    image TEXT,
    size VARCHAR(10),
    color VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabel Transactions (Jika belum ada)
  CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    transaction_code VARCHAR(50) UNIQUE,
    total_amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50),
    status VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabel Transaction Items (Jika belum ada)
  CREATE TABLE IF NOT EXISTS transaction_items (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    subtotal DECIMAL(15, 2) NOT NULL
  );
`;

const sampleCategories = [
  "Pakaian Pria", "Pakaian Wanita", "Aksesoris", "Sepatu"
];

const sampleProducts = [
  { name: "Kemeja Flannel Kotak", price: 150000, stock: 50, category: "Pakaian Pria" },
  { name: "Kaos Polos Hitam", price: 75000, stock: 100, category: "Pakaian Pria" },
  { name: "Dress Floral Summer", price: 250000, stock: 25, category: "Pakaian Wanita" },
  { name: "Celana Jeans Slim", price: 300000, stock: 40, category: "Pakaian Pria" },
  { name: "Topi Baseball", price: 50000, stock: 15, category: "Aksesoris" }
];

async function fixDatabase() {
  try {
    console.log('🔄 Memulai perbaikan database...');
    
    // 1. Buat Tabel yang Kurang
    await pool.query(createTablesQuery);
    console.log('✅ Struktur tabel dipastikan lengkap.');

    // 2. Cek apakah kategori kosong
    const catCheck = await pool.query('SELECT COUNT(*) FROM categories');
    if (parseInt(catCheck.rows[0].count) === 0) {
      console.log('📦 Mengisi data kategori default...');
      for (const cat of sampleCategories) {
        await pool.query('INSERT INTO categories (name) VALUES ($1)', [cat]);
      }
    }

    // 3. Cek apakah produk kosong
    const prodCheck = await pool.query('SELECT COUNT(*) FROM products');
    if (parseInt(prodCheck.rows[0].count) === 0) {
      console.log('👕 Mengisi data produk default...');
      // Get category IDs
      const cats = await pool.query('SELECT id, name FROM categories');
      
      for (const prod of sampleProducts) {
        const catId = cats.rows.find(c => c.name === prod.category)?.id || cats.rows[0].id;
        await pool.query(
          `INSERT INTO products (name, category_id, price, stock, description) 
           VALUES ($1, $2, $3, $4, 'Produk contoh otomatis')`,
          [prod.name, catId, prod.price, prod.stock]
        );
      }
    }

    console.log('🎉 Database SIAP! User lama Anda aman.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing database:', error);
    process.exit(1);
  }
}

fixDatabase();
