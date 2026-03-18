import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Setup uploads directory
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve uploads statically
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Setup SQLite
const db = new Database('database.sqlite');

db.exec(`
  CREATE TABLE IF NOT EXISTS loteamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    imageUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE TABLE IF NOT EXISTS lotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loteamentoId INTEGER,
    name TEXT,
    polygon TEXT,
    area TEXT,
    status TEXT,
    owner TEXT,
    photoUrl TEXT,
    notes TEXT,
    FOREIGN KEY(loteamentoId) REFERENCES loteamentos(id)
  );

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loteamentoId INTEGER,
    loteId INTEGER,
    name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT DEFAULT 'Novo',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(loteamentoId) REFERENCES loteamentos(id),
    FOREIGN KEY(loteId) REFERENCES lotes(id)
  );
`);

// Add new columns if they don't exist
const addColumn = (table: string, column: string, definition: string) => {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (e) {
    // Ignore if column already exists
  }
};

addColumn('lotes', 'price', 'REAL DEFAULT 0');
addColumn('lotes', 'buyerName', 'TEXT');
addColumn('lotes', 'buyerCpf', 'TEXT');
addColumn('lotes', 'brokerName', 'TEXT');
addColumn('lotes', 'paymentStatus', 'TEXT DEFAULT "pendente"');
addColumn('lotes', 'downPayment', 'REAL DEFAULT 0');
addColumn('lotes', 'installments', 'INTEGER DEFAULT 1');

// API Routes
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';
const ADMIN_TOKEN = 'admin-token-secret-123';

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    res.json({ token: ADMIN_TOKEN });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

app.get('/api/loteamentos', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM loteamentos ORDER BY createdAt DESC').all();
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/loteamentos', requireAuth, upload.single('image'), (req, res) => {
  try {
    const { name } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    
    const stmt = db.prepare('INSERT INTO loteamentos (name, imageUrl) VALUES (?, ?)');
    const info = stmt.run(name, imageUrl);
    
    res.json({ id: info.lastInsertRowid, name, imageUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/loteamentos/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM loteamentos WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/loteamentos/:id/lotes', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM lotes WHERE loteamentoId = ?').all(req.params.id);
    const lotes = rows.map((r: any) => ({
      ...r,
      polygon: JSON.parse(r.polygon)
    }));
    res.json(lotes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lotes', requireAuth, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT lotes.*, loteamentos.name as loteamentoName 
      FROM lotes 
      LEFT JOIN loteamentos ON lotes.loteamentoId = loteamentos.id
    `).all();
    
    const lotes = rows.map((r: any) => ({
      ...r,
      polygon: JSON.parse(r.polygon)
    }));
    res.json(lotes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lotes', requireAuth, (req, res) => {
  try {
    const { 
      loteamentoId, name, polygon, area, status, owner, photoUrl, notes,
      price, buyerName, buyerCpf, brokerName, paymentStatus, downPayment, installments
    } = req.body;
    
    const stmt = db.prepare(
      `INSERT INTO lotes (
        loteamentoId, name, polygon, area, status, owner, photoUrl, notes,
        price, buyerName, buyerCpf, brokerName, paymentStatus, downPayment, installments
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      loteamentoId, name, JSON.stringify(polygon), area, status, owner, photoUrl, notes,
      price || 0, buyerName || '', buyerCpf || '', brokerName || '', paymentStatus || 'pendente', downPayment || 0, installments || 1
    );
    
    res.json({ id: info.lastInsertRowid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/lotes/:id', requireAuth, (req, res) => {
  try {
    const { 
      name, polygon, area, status, owner, photoUrl, notes,
      price, buyerName, buyerCpf, brokerName, paymentStatus, downPayment, installments
    } = req.body;
    
    const fields = [];
    const values = [];
    
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (polygon !== undefined) { fields.push('polygon = ?'); values.push(JSON.stringify(polygon)); }
    if (area !== undefined) { fields.push('area = ?'); values.push(area); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (owner !== undefined) { fields.push('owner = ?'); values.push(owner); }
    if (photoUrl !== undefined) { fields.push('photoUrl = ?'); values.push(photoUrl); }
    if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }
    if (price !== undefined) { fields.push('price = ?'); values.push(price); }
    if (buyerName !== undefined) { fields.push('buyerName = ?'); values.push(buyerName); }
    if (buyerCpf !== undefined) { fields.push('buyerCpf = ?'); values.push(buyerCpf); }
    if (brokerName !== undefined) { fields.push('brokerName = ?'); values.push(brokerName); }
    if (paymentStatus !== undefined) { fields.push('paymentStatus = ?'); values.push(paymentStatus); }
    if (downPayment !== undefined) { fields.push('downPayment = ?'); values.push(downPayment); }
    if (installments !== undefined) { fields.push('installments = ?'); values.push(installments); }
    
    if (fields.length === 0) return res.json({ success: true });
    
    values.push(req.params.id);
    
    const stmt = db.prepare(`UPDATE lotes SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lotes/:id', requireAuth, (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM lotes WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all leads
app.get('/api/leads', requireAuth, (req, res) => {
  try {
    const leads = db.prepare(`
      SELECT l.*, lt.name as loteName, lo.name as loteamentoName 
      FROM leads l
      LEFT JOIN lotes lt ON l.loteId = lt.id
      LEFT JOIN loteamentos lo ON l.loteamentoId = lo.id
      ORDER BY l.createdAt DESC
    `).all();
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Create a new lead (public)
app.post('/api/leads', (req, res) => {
  const { loteamentoId, loteId, name, email, phone } = req.body;
  try {
    const stmt = db.prepare('INSERT INTO leads (loteamentoId, loteId, name, email, phone) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(loteamentoId, loteId, name, email, phone);
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update a lead status
app.put('/api/leads/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const stmt = db.prepare('UPDATE leads SET status = ? WHERE id = ?');
    stmt.run(status, id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
