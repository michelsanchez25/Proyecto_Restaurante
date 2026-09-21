const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = "restaurante_secret_key_2026";
let db;

(async () => {
  // Abrir o crear la base de datos del Backend
  db = await open({ filename: './restaurante.db', driver: sqlite3.Database });

  // Crear tablas de Usuarios y Pedidos
  await db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      rol TEXT
    );
    CREATE TABLE IF NOT EXISTS pedidos (
      id TEXT PRIMARY KEY,
      mesa TEXT,
      platillo TEXT,
      precio REAL,
      notas TEXT,
      estado TEXT,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // ============================================================
  // 🔑 INSERCIÓN AUTOMÁTICA DE USUARIOS Y ROLES INICIALES
  // ============================================================
  const crearUsuarioSiNoExiste = async (id, email, passwordPlana, rol) => {
    const user = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (!user) {
      const hashed = await bcrypt.hash(passwordPlana, 10);
      await db.run('INSERT INTO usuarios VALUES (?, ?, ?, ?)', [id, email, hashed, rol]);
      console.log(`✅ Usuario creado: ${email} | Rol: ${rol}`);
    }
  };

  // Crear los 4 roles predeterminados para pruebas y operación
  await crearUsuarioSiNoExiste('1', 'admin@restaurante.com', 'admin123', 'ADMIN');
  await crearUsuarioSiNoExiste('2', 'mesero@restaurante.com', 'mesero123', 'MESERO');
  await crearUsuarioSiNoExiste('3', 'cocina@restaurante.com', 'cocina123', 'COCINA');
  await crearUsuarioSiNoExiste('4', 'caja@restaurante.com', 'caja123', 'CAJA');

  console.log("🚀 Backend y Base de Datos listos.");
})();

// ============================================================
// 🚪 ENDPOINT DE LOGIN (Verifica Credenciales y Rol)
// ============================================================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await db.get('SELECT * FROM usuarios WHERE email = ?', [email]);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  // Generar Token JWT con el Rol del usuario
  const token = jwt.sign({ id: user.id, rol: user.rol }, JWT_SECRET);
  
  res.json({ 
    token, 
    user: { id: user.id, email: user.email, rol: user.rol } 
  });
});

// ============================================================
// ➕ ENDPOINT DE REGISTRO (Usado por el Administrador)
// ============================================================
app.post('/api/register', async (req, res) => {
  const { id, email, password, rol = 'MESERO' } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.run('INSERT INTO usuarios VALUES (?, ?, ?, ?)', [id, email, hashed, rol]);
    res.json({ message: "Usuario creado exitosamente" });
  } catch (err) {
    res.status(400).json({ error: "El correo ya está registrado" });
  }
});

// ============================================================
// 🔄 ENDPOINT DE SINCRONIZACIÓN DE PEDIDOS (Offline -> Online)
// ============================================================
app.post('/api/pedidos/sync', async (req, res) => {
  const { pedidos } = req.body;
  if (!pedidos || !Array.isArray(pedidos)) return res.status(400).json({ error: "Datos inválidos" });

  for (let p of pedidos) {
    await db.run(
      `INSERT INTO pedidos (id, mesa, platillo, precio, notas, estado)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET estado=excluded.estado, notas=excluded.notas`,
      [p.id, p.mesa, p.platillo, p.precio, p.notas, p.estado]
    );
  }
  res.json({ success: true, message: "Pedidos sincronizados" });
});

app.listen(3000, () => console.log("Servidor escuchando en http://localhost:3000"));