import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("trend_phone.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT CHECK(role IN ('admin', 'accountant', 'engineer'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Default settings
  INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'USD');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('rate_yer', '530'); -- USD to YER
  INSERT OR IGNORE INTO settings (key, value) VALUES ('rate_sar', '3.75'); -- USD to SAR

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    category TEXT, -- 'phone', 'accessory'
    brand TEXT,
    model TEXT,
    sku TEXT UNIQUE,
    price REAL,
    cost REAL,
    stock_quantity INTEGER DEFAULT 0,
    opening_stock INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 5,
    unit TEXT,
    notes TEXT,
    warehouse_id INTEGER,
    location TEXT
  );

  CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    location TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    opening_balance REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    balance REAL DEFAULT 0,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    user_id INTEGER,
    total_amount REAL,
    payment_status TEXT CHECK(payment_status IN ('paid', 'partial', 'unpaid')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_cost REAL,
    subtotal REAL,
    FOREIGN KEY(purchase_id) REFERENCES purchases(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS supplier_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER,
    type TEXT CHECK(type IN ('purchase', 'payment')),
    amount REAL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    user_id INTEGER,
    total_amount REAL,
    discount REAL DEFAULT 0,
    payment_status TEXT CHECK(payment_status IN ('paid', 'partial', 'unpaid')),
    payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    unit_price REAL,
    subtotal REAL,
    FOREIGN KEY(sale_id) REFERENCES sales(id),
    FOREIGN KEY(product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    type TEXT CHECK(type IN ('sale', 'payment')),
    amount REAL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    customer_phone TEXT,
    device_model TEXT,
    imei TEXT,
    device_condition TEXT,
    fault_description TEXT,
    symptoms TEXT,
    maintenance_type TEXT, -- 'screen', 'battery', 'software', 'other'
    cost REAL DEFAULT 0,
    status TEXT DEFAULT 'received', -- 'received', 'in_progress', 'completed', 'delivered'
    notes TEXT,
    next_maintenance_date DATETIME,
    received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    user_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS general_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT CHECK(type IN ('revenue', 'expense')),
    category TEXT,
    amount REAL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS stock_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    type TEXT CHECK(type IN ('damaged', 'correction', 'lost')),
    quantity INTEGER,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(product_id) REFERENCES products(id)
  );
`);

// Helper to update customer balance
const updateCustomerBalance = (customerId: number) => {
  const stats = db.prepare(`
    SELECT 
      SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as total_sales,
      SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as total_payments
    FROM transactions 
    WHERE customer_id = ?
  `).get(customerId) as any;
  
  const balance = (stats.total_sales || 0) - (stats.total_payments || 0);
  db.prepare("UPDATE customers SET balance = ? WHERE id = ?").run(balance, customerId);
};

// Seed initial admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", "admin123", "admin");
}

const updateSupplierBalance = (supplierId: number) => {
  const stats = db.prepare(`
    SELECT 
      SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as total_purchases,
      SUM(CASE WHEN type = 'payment' THEN amount ELSE 0 END) as total_payments
    FROM supplier_transactions 
    WHERE supplier_id = ?
  `).get(supplierId) as any;
  
  const balance = (stats.total_purchases || 0) - (stats.total_payments || 0);
  db.prepare("UPDATE suppliers SET balance = ? WHERE id = ?").run(balance, supplierId);
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT id, username, role FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/register", (req, res) => {
    const { username, password, role } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(username, password, role);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, s: any) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const settings = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    const transaction = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        stmt.run(key, String(value));
      }
    });
    transaction(settings);
    res.json({ success: true });
  });

  // Products
  app.get("/api/products", (req, res) => {
    const products = db.prepare("SELECT * FROM products").all();
    res.json(products);
  });

  app.post("/api/products", (req, res) => {
    const { name, category, brand, model, sku, price, cost, stock_quantity, opening_stock, min_stock_level, unit, notes, warehouse_id, location } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO products (name, category, brand, model, sku, price, cost, stock_quantity, opening_stock, min_stock_level, unit, notes, warehouse_id, location)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(name, category, brand, model, sku, price, cost, stock_quantity, opening_stock || stock_quantity, min_stock_level, unit, notes, warehouse_id, location);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const { name, category, brand, model, sku, price, cost, stock_quantity, min_stock_level, unit, notes, warehouse_id, location } = req.body;
    db.prepare(`
      UPDATE products SET name=?, category=?, brand=?, model=?, sku=?, price=?, cost=?, stock_quantity=?, min_stock_level=?, unit=?, notes=?, warehouse_id=?, location=?
      WHERE id=?
    `).run(name, category, brand, model, sku, price, cost, stock_quantity, min_stock_level, unit, notes, warehouse_id, location, id);
    res.json({ success: true });
  });

  // Sales
  app.get("/api/sales", (req, res) => {
    const sales = db.prepare(`
      SELECT s.*, c.name as customer_name 
      FROM sales s 
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC
    `).all();
    res.json(sales);
  });

  app.post("/api/sales", (req, res) => {
    const { customer_id, user_id, total_amount, discount, payment_status, payment_method, items } = req.body;
    
    const transaction = db.transaction(() => {
      const saleResult = db.prepare(`
        INSERT INTO sales (customer_id, user_id, total_amount, discount, payment_status, payment_method)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(customer_id, user_id, total_amount, discount, payment_status, payment_method);
      
      const saleId = saleResult.lastInsertRowid;

      // Record transaction for the sale
      if (customer_id) {
        db.prepare(`
          INSERT INTO transactions (customer_id, type, amount, description)
          VALUES (?, 'sale', ?, ?)
        `).run(customer_id, total_amount, `Sale #${saleId}`);

        // If paid, record payment transaction
        if (payment_status === 'paid') {
          db.prepare(`
            INSERT INTO transactions (customer_id, type, amount, description)
            VALUES (?, 'payment', ?, ?)
          `).run(customer_id, total_amount, `Payment for Sale #${saleId}`);
        }
        
        updateCustomerBalance(customer_id);
      }

      for (const item of items) {
        db.prepare(`
          INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `).run(saleId, item.product_id, item.quantity, item.unit_price, item.subtotal);

        // Update stock
        db.prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?").run(item.quantity, item.product_id);
      }

      return saleId;
    });

    try {
      const id = transaction();
      res.json({ id });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Customers
  app.get("/api/customers", (req, res) => {
    const customers = db.prepare("SELECT * FROM customers").all();
    res.json(customers);
  });

  app.post("/api/customers", (req, res) => {
    const { name, phone, email, address, opening_balance, notes } = req.body;
    const result = db.prepare("INSERT INTO customers (name, phone, email, address, opening_balance, balance, notes) VALUES (?, ?, ?, ?, ?, ?, ?)").run(name, phone, email, address, opening_balance, opening_balance, notes);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/customers/:id/statement", (req, res) => {
    const { id } = req.params;
    const transactions = db.prepare("SELECT * FROM transactions WHERE customer_id = ? ORDER BY created_at DESC").all(id);
    res.json(transactions);
  });

  app.post("/api/payments", (req, res) => {
    const { customer_id, amount, description } = req.body;
    const result = db.prepare("INSERT INTO transactions (customer_id, type, amount, description) VALUES (?, 'payment', ?, ?)").run(customer_id, amount, description);
    updateCustomerBalance(customer_id);
    res.json({ id: result.lastInsertRowid });
  });

  // Suppliers
  app.get("/api/suppliers", (req, res) => {
    const suppliers = db.prepare("SELECT * FROM suppliers").all();
    res.json(suppliers);
  });

  app.post("/api/suppliers", (req, res) => {
    const { name, contact_person, phone, email, notes } = req.body;
    const result = db.prepare("INSERT INTO suppliers (name, contact_person, phone, email, notes) VALUES (?, ?, ?, ?, ?)").run(name, contact_person, phone, email, notes);
    res.json({ id: result.lastInsertRowid });
  });

  // Warehouses
  app.get("/api/warehouses", (req, res) => {
    const warehouses = db.prepare("SELECT * FROM warehouses").all();
    res.json(warehouses);
  });

  app.post("/api/warehouses", (req, res) => {
    const { name, location, notes } = req.body;
    const result = db.prepare("INSERT INTO warehouses (name, location, notes) VALUES (?, ?, ?)").run(name, location, notes);
    res.json({ id: result.lastInsertRowid });
  });

  // Maintenance
  app.get("/api/maintenance", (req, res) => {
    const records = db.prepare("SELECT * FROM maintenance ORDER BY received_at DESC").all();
    res.json(records);
  });

  app.post("/api/maintenance", (req, res) => {
    const { 
      customer_name, customer_phone, device_model, imei, 
      device_condition, fault_description, symptoms, 
      maintenance_type, cost, notes, next_maintenance_date, user_id 
    } = req.body;
    
    try {
      const result = db.prepare(`
        INSERT INTO maintenance (
          customer_name, customer_phone, device_model, imei, 
          device_condition, fault_description, symptoms, 
          maintenance_type, cost, notes, next_maintenance_date, user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        customer_name, customer_phone, device_model, imei, 
        device_condition, fault_description, symptoms, 
        maintenance_type, cost, notes, next_maintenance_date, user_id
      );
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/maintenance/:id", (req, res) => {
    const { id } = req.params;
    const { status, completed_at } = req.body;
    db.prepare("UPDATE maintenance SET status = ?, completed_at = ? WHERE id = ?")
      .run(status, completed_at, id);
    res.json({ success: true });
  });

  // Purchases
  app.get("/api/purchases", (req, res) => {
    const purchases = db.prepare(`
      SELECT p.*, s.name as supplier_name 
      FROM purchases p 
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      ORDER BY p.created_at DESC
    `).all();
    res.json(purchases);
  });

  app.post("/api/purchases", (req, res) => {
    const { supplier_id, user_id, total_amount, payment_status, items } = req.body;
    
    const transaction = db.transaction(() => {
      const purchaseResult = db.prepare(`
        INSERT INTO purchases (supplier_id, user_id, total_amount, payment_status)
        VALUES (?, ?, ?, ?)
      `).run(supplier_id, user_id, total_amount, payment_status);
      
      const purchaseId = purchaseResult.lastInsertRowid;

      // Record supplier transaction
      db.prepare(`
        INSERT INTO supplier_transactions (supplier_id, type, amount, description)
        VALUES (?, 'purchase', ?, ?)
      `).run(supplier_id, total_amount, `Purchase #${purchaseId}`);

      if (payment_status === 'paid') {
        db.prepare(`
          INSERT INTO supplier_transactions (supplier_id, type, amount, description)
          VALUES (?, 'payment', ?, ?)
        `).run(supplier_id, total_amount, `Payment for Purchase #${purchaseId}`);
      }
      
      updateSupplierBalance(supplier_id);

      for (const item of items) {
        db.prepare(`
          INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `).run(purchaseId, item.product_id, item.quantity, item.unit_cost, item.subtotal);

        // Update stock and cost price
        db.prepare(`
          UPDATE products 
          SET stock_quantity = stock_quantity + ?, cost = ? 
          WHERE id = ?
        `).run(item.quantity, item.unit_cost, item.product_id);
      }

      return purchaseId;
    });

    try {
      const id = transaction();
      res.json({ id });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/supplier-payments", (req, res) => {
    const { supplier_id, amount, description } = req.body;
    
    try {
      db.prepare(`
        INSERT INTO supplier_transactions (supplier_id, type, amount, description)
        VALUES (?, 'payment', ?, ?)
      `).run(supplier_id, amount, description || 'Payment to supplier');
      
      updateSupplierBalance(supplier_id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // General Ledger (Revenue/Expenses)
  app.get("/api/ledger", (req, res) => {
    try {
      const entries = db.prepare("SELECT * FROM general_ledger ORDER BY created_at DESC").all();
      res.json(entries);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ledger", (req, res) => {
    const { type, category, amount, description } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO general_ledger (type, category, amount, description)
        VALUES (?, ?, ?, ?)
      `).run(type, category, amount, description);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Stock Adjustments (Damaged Goods, etc.)
  app.get("/api/stock-adjustments", (req, res) => {
    try {
      const adjustments = db.prepare(`
        SELECT sa.*, p.name as product_name 
        FROM stock_adjustments sa 
        JOIN products p ON sa.product_id = p.id 
        ORDER BY sa.created_at DESC
      `).all();
      res.json(adjustments);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/stock-adjustments", (req, res) => {
    const { product_id, type, quantity, reason } = req.body;
    try {
      db.transaction(() => {
        db.prepare(`
          INSERT INTO stock_adjustments (product_id, type, quantity, reason)
          VALUES (?, ?, ?, ?)
        `).run(product_id, type, quantity, reason);

        // Update product stock
        db.prepare(`
          UPDATE products 
          SET stock_quantity = stock_quantity - ? 
          WHERE id = ?
        `).run(quantity, product_id);
      })();
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Stats
  app.get("/api/stats", (req, res) => {
    const totalSales = db.prepare("SELECT SUM(total_amount) as total FROM sales").get() as any;
    const totalPurchases = db.prepare("SELECT SUM(total_amount) as total FROM purchases").get() as any;
    const totalProducts = db.prepare("SELECT COUNT(*) as count FROM products").get() as any;
    const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE stock_quantity <= min_stock_level").get() as any;
    const recentSales = db.prepare("SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id ORDER BY created_at DESC LIMIT 5").all();
    
    const totalRevenue = db.prepare("SELECT SUM(amount) as total FROM general_ledger WHERE type = 'revenue'").get() as any;
    const totalExpenses = db.prepare("SELECT SUM(amount) as total FROM general_ledger WHERE type = 'expense'").get() as any;

    res.json({
      totalSales: totalSales.total || 0,
      totalPurchases: totalPurchases.total || 0,
      totalProducts: totalProducts.count || 0,
      lowStock: lowStock.count || 0,
      totalRevenue: totalRevenue.total || 0,
      totalExpenses: totalExpenses.total || 0,
      recentSales
    });
  });

  // Backup & Restore
  const TABLES = [
    'users', 'settings', 'products', 'warehouses', 'suppliers', 
    'supplier_transactions', 'customers', 'sales', 'sale_items', 
    'transactions', 'maintenance', 'purchases', 'purchase_items',
    'general_ledger', 'stock_adjustments'
  ];

  app.get("/api/backup/export", (req, res) => {
    try {
      const backup: any = {};
      TABLES.forEach(table => {
        backup[table] = db.prepare(`SELECT * FROM ${table}`).all();
      });
      res.json(backup);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/backup/import", express.json({ limit: '50mb' }), (req, res) => {
    const backup = req.body;
    const transaction = db.transaction(() => {
      TABLES.forEach(table => {
        if (backup[table]) {
          db.prepare(`DELETE FROM ${table}`).run();
          if (backup[table].length > 0) {
            const columns = Object.keys(backup[table][0]);
            const placeholders = columns.map(() => '?').join(',');
            const insert = db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`);
            backup[table].forEach((row: any) => {
              insert.run(columns.map(col => row[col]));
            });
          }
        }
      });
    });

    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Google Drive OAuth
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/api/auth/google/callback`
  );

  app.get("/api/auth/google/url", (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
    });
    res.json({ url });
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const { code } = req.query;
    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      
      // Export data
      const backup: any = {};
      TABLES.forEach(table => {
        backup[table] = db.prepare(`SELECT * FROM ${table}`).all();
      });
      const content = JSON.stringify(backup, null, 2);

      // Upload to Drive
      await drive.files.create({
        requestBody: {
          name: `TrendPhone_Backup_${new Date().toISOString().split('T')[0]}.json`,
          mimeType: 'application/json',
        },
        media: {
          mimeType: 'application/json',
          body: content,
        },
      });

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white;">
            <div style="text-align: center;">
              <h2 style="color: #10b981;">تم النسخ الاحتياطي بنجاح!</h2>
              <p>تم حفظ نسخة من بياناتك على Google Drive.</p>
              <button onclick="window.close()" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-weight: bold;">إغلاق النافذة</button>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_BACKUP_SUCCESS' }, '*');
                setTimeout(() => window.close(), 3000);
              }
            </script>
          </body>
        </html>
      `);
    } catch (e: any) {
      res.status(500).send(`Error: ${e.message}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
