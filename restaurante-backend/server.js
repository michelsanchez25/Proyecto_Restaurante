const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = "restaurante_secret_key_2026";

// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  user: 'postgres',         // Tu usuario de PostgreSQL
  host: 'localhost',
  database: 'restaurante_db',
  password: '1234',         // 👈 Cambia esto por la contraseña real de tu PostgreSQL
  port: 5432,
  connectionString: 'postgres://postgres:1234@localhost:5432/restaurante_db?client_encoding=UTF8'
});

// Comprobar conexión al iniciar el servidor
(async () => {
  try {
    const client = await pool.connect();
    client.release();
    console.log("🚀 Servidor Backend conectado exitosamente a PostgreSQL.");
  } catch (error) {
    console.error("❌ Error al conectar con PostgreSQL:", error.message);
  }
})();

// ============================================================
// 🚪 ENDPOINT DE LOGIN (Verifica Credenciales y Rol)
// ============================================================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query('SELECT * FROM empleados WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const token = jwt.sign({ id: user.id, rol: user.rol }, JWT_SECRET);
    
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre } 
    });
  } catch (err) {
    res.status(500).json({ error: "Error en el servidor", details: err.message });
  }
});

// ============================================================
// ➕ ENDPOINT DE REGISTRO (Usado por el Administrador)
// ============================================================
app.post('/api/register', async (req, res) => {
  const { id, nombre, email, password, rol = 'MESERO' } = req.body;
  try {
    const hashed = await bcrypt.hash(password || '123456', 10);
    await pool.query(
      'INSERT INTO empleados (id, nombre, email, rol, password) VALUES ($1, $2, $3, $4, $5)',
      [id || Date.now().toString(), nombre || 'Empleado', email, rol, hashed]
    );
    res.json({ success: true, message: "Usuario creado exitosamente en PostgreSQL" });
  } catch (err) {
    res.status(400).json({ success: false, error: "El email ya está registrado o faltan datos", details: err.message });
  }
});


// ============================================================
// 👥 ENDPOINTS DE EMPLEADOS / USUARIOS (Lectura y Actualización)
// ============================================================

// Obtener la lista de empleados
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, email, rol FROM empleados');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuarios", details: err.message });
  }
});

// Registrar o actualizar un usuario desde el panel de administración
app.post('/api/usuarios', async (req, res) => {
  const { id, nombre, email, password, rol } = req.body;
  try {
    const hashed = await bcrypt.hash(password || '123456', 10);
    await pool.query(
      `INSERT INTO empleados (id, nombre, email, rol, password) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET rol = EXCLUDED.rol, nombre = EXCLUDED.nombre`,
      [id || Date.now().toString(), nombre || email.split('@')[0], email, rol || 'MESERO', hashed]
    );
    res.json({ success: true, message: "Usuario guardado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al registrar usuario", details: err.message });
  }
});

// Actualizar datos de un empleado existente (PUT)
app.put('/api/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { email, rol, nombre } = req.body;
  try {
    await pool.query(
      `UPDATE empleados SET email = $1, rol = $2, nombre = COALESCE($3, nombre) WHERE id = $4`,
      [email, rol, nombre, id]
    );
    res.json({ success: true, message: "Empleado actualizado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar empleado", details: err.message });
  }
});


// ============================================================
// 🍽️ ENDPOINTS DE MENÚ / PRODUCTOS
// ============================================================

// Obtener el menú desde la tabla 'productos'
app.get('/api/menu', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, nombre, precio, categoria FROM productos');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener el menú", details: err.message });
  }
});

// Agregar o actualizar un platillo en la tabla 'productos'
app.post('/api/menu', async (req, res) => {
  const { id, nombre, precio, categoria } = req.body;
  try {
    await pool.query(
      `INSERT INTO productos (id, nombre, precio, categoria) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, categoria = EXCLUDED.categoria`,
      [id || Date.now().toString(), nombre, precio, categoria]
    );
    res.json({ success: true, message: "Platillo guardado exitosamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar el platillo", details: err.message });
  }
});

// Actualizar un platillo específico por ID (PUT)
app.put('/api/menu/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, precio, categoria } = req.body;
  try {
    await pool.query(
      `UPDATE productos SET nombre = $1, precio = $2, categoria = $3 WHERE id = $4`,
      [nombre, precio, categoria, id]
    );
    res.json({ success: true, message: "Platillo actualizado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar platillo", details: err.message });
  }
});


// ============================================================
// 📦 ENDPOINTS DE ÓRDENES / PEDIDOS
// ============================================================

// Obtener órdenes
app.get('/api/ordenes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ordenes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener órdenes", details: err.message });
  }
});

// Crear orden
app.post('/api/ordenes', async (req, res) => {
  const { id, mesa, items, estado, total, hora } = req.body;
  const client = await pool.connect();
  
  try {
    let itemsFormatted = typeof items === 'string' ? items : JSON.stringify(items);
    
    // 🚨 LIMPIEZA MÁGICA DE CARACTERES
    itemsFormatted = itemsFormatted.replace(/[\u202F\u00A0]/g, ' ');
    const horaLimpia = hora ? String(hora).replace(/[\u202F\u00A0]/g, ' ') : '00:00';
    const mesaLimpia = mesa ? String(mesa).replace(/[\u202F\u00A0]/g, ' ') : '';
    const ordenId = id || `${Date.now()}`;

    await client.query('BEGIN');

    // Intentamos insertar. Si ya existe (violación de unicidad), la actualizamos en lugar de crashear.
    await client.query(
      `INSERT INTO ordenes (id, mesa, items, estado, total, hora) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado, total = EXCLUDED.total`,
      [ordenId, mesaLimpia, itemsFormatted, estado || 'PENDIENTE', total || 0, horaLimpia]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: "Orden creada o actualizada exitosamente" });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error al crear orden:", err.message);
    res.status(500).json({ error: "Error al crear la orden", details: err.message });
  } finally {
    client.release();
  }
});

// Actualizar estado de una orden
app.put('/api/ordenes/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;
  try {
    await pool.query('UPDATE ordenes SET estado = $1 WHERE id = $2', [estado, id]);
    res.json({ success: true, message: "Estado de orden actualizado" });
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar estado", details: err.message });
  }
});


// ============================================================
// 🔄 ENDPOINT DE SINCRONIZACIÓN MASIVA (Offline -> Online)
// ============================================================
app.post('/api/sincronizar', async (req, res) => {
  const { pedidos, productos, facturas, empleados } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (empleados && Array.isArray(empleados)) {
      for (let e of empleados) {
        const hashedEmp = e.password && e.password.startsWith('$2a$') ? e.password : await bcrypt.hash(e.password || '123456', 10);
        await client.query(
          `INSERT INTO empleados (id, nombre, email, rol, password) 
           VALUES ($1, $2, $3, $4, $5) 
           ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol`,
          [e.id, e.nombre, e.email || e.correo, e.rol || 'MESERO', hashedEmp]
        );
      }
    }

    if (productos && Array.isArray(productos)) {
      for (let p of productos) {
        await client.query(
          `INSERT INTO productos (id, nombre, precio, categoria) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (id) DO UPDATE SET nombre = EXCLUDED.nombre, precio = EXCLUDED.precio, categoria = EXCLUDED.categoria`,
          [p.id, p.nombre, p.precio, p.categoria]
        );
      }
    }

    if (pedidos && Array.isArray(pedidos)) {
      for (let p of pedidos) {
        const itemsVal = typeof (p.items || p.platillo) === 'string' ? (p.items || p.platillo) : JSON.stringify(p.items || p.platillo);
        await client.query(
          `INSERT INTO ordenes (id, mesa, items, estado, total, hora) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado`,
          [p.id, p.mesa, itemsVal, p.estado || 'PENDIENTE', p.total || p.precio || 0, p.hora || '00:00']
        );
      }
    }

    if (facturas && Array.isArray(facturas)) {
      for (let f of facturas) {
        await client.query(
          `INSERT INTO facturas (id, orden_id, mesa, total, metodo_pago, fecha) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (id) DO NOTHING`,
          [f.id, f.ordenId, f.mesa, f.total, f.metodoPago, f.fecha]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: "Sincronización masiva completada con éxito." });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
});

// Ruta de prueba
app.get('/api/ping', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'API Online conectada a PostgreSQL', time: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ error: 'Fallo la conexión con la base de datos' });
  }
});

app.listen(3000, () => console.log("🚀 Servidor Backend escuchando en http://localhost:3000"));