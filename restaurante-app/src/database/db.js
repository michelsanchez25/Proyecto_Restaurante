import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db = null;
if (Platform.OS !== 'web') {
  db = SQLite.openDatabaseSync('restaurante_pos.db');
}

// Helper para persistencia en Web vía localStorage
const getWebStorage = (key, defaultData) => {
  if (typeof window === 'undefined') return defaultData;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(stored);
};

const setWebStorage = (key, data) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

const defaultMenu = [
  { id: '1', nombre: 'Hamburguesa Especial', precio: 22000, categoria: 'Comida Rápida' },
  { id: '2', nombre: 'Perro Caliente XL', precio: 15000, categoria: 'Comida Rápida' },
  { id: '3', nombre: 'Gaseosa 500ml', precio: 5000, categoria: 'Bebidas' }
];

const defaultUsuarios = [
  { id: '1', email: 'admin@restaurante.com', rol: 'ADMIN' },
  { id: '2', email: 'mesero@restaurante.com', rol: 'MESERO' },
  { id: '3', email: 'cocina@restaurante.com', rol: 'COCINA' },
  { id: '4', email: 'caja@restaurante.com', rol: 'CAJA' }
];

export const initDB = async () => {
  if (Platform.OS === 'web') {
    getWebStorage('@resto_menu', defaultMenu);
    getWebStorage('@resto_usuarios', defaultUsuarios);
    getWebStorage('@resto_ordenes', []);
    getWebStorage('@resto_facturas', []);
    return;
  }

  if (!db) return;

  try {

    db.execSync(`
      CREATE TABLE IF NOT EXISTS menu (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        categoria TEXT
      );
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        rol TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ordenes (
        id TEXT PRIMARY KEY,
        mesa TEXT NOT NULL,
        items TEXT NOT NULL,
        estado TEXT NOT NULL,
        total REAL NOT NULL,
        hora TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS facturas (
        id TEXT PRIMARY KEY,
        ordenId TEXT NOT NULL,
        mesa TEXT NOT NULL,
        total REAL NOT NULL,
        metodoPago TEXT NOT NULL,
        fecha TEXT NOT NULL
      );
    `);
  } catch (error) {
    console.error("Error inicializando la base de datos:", error);
  }
};

// ================= FUNCIONES DE MENÚ =================

export const agregarPlatilloMenu = async (id, nombre, precio, categoria) => {
  const nuevoPlatillo = { id, nombre, precio: parseFloat(precio), categoria: categoria || 'General' };
  
  if (Platform.OS === 'web' || !db) {
    const menu = getWebStorage('@resto_menu', defaultMenu);
    menu.push(nuevoPlatillo);
    setWebStorage('@resto_menu', menu);
    return true;
  }

  try {
    await db.runAsync(
      'INSERT INTO menu (id, nombre, precio, categoria) VALUES (?, ?, ?, ?)',
      [id, nombre, parseFloat(precio), categoria || 'General']
    );
    return true;
  } catch (error) {
    console.error("Error agregando platillo:", error);
    return false;
  }
};

export const actualizarPlatilloMenu = async (id, nombre, precio, categoria) => {
  if (Platform.OS === 'web' || !db) {
    let menu = getWebStorage('@resto_menu', defaultMenu);
    menu = menu.map(item => item.id === id ? { id, nombre, precio: parseFloat(precio), categoria } : item);
    setWebStorage('@resto_menu', menu);
    return true;
  }

  try {
    await db.runAsync(
      'UPDATE menu SET nombre = ?, precio = ?, categoria = ? WHERE id = ?',
      [nombre, parseFloat(precio), categoria || 'General', id]
    );
    return true;
  } catch (error) {
    console.error("Error actualizando platillo:", error);
    return false;
  }
};

export const obtenerMenu = async () => {
  if (Platform.OS === 'web' || !db) {
    return getWebStorage('@resto_menu', defaultMenu);
  }

  try {
    const result = await db.getAllAsync('SELECT * FROM menu');
    return result;
  } catch (error) {
    console.error("Error obteniendo menú:", error);
    return [];
  }
};

// ================= FUNCIONES DE USUARIOS / EMPLEADOS =================

export const guardarUsuarioLocal = async (id, email, password, rol) => {
  if (Platform.OS === 'web' || !db) {
    const usuarios = getWebStorage('@resto_usuarios', defaultUsuarios);
    const existe = usuarios.findIndex(u => u.id === id || u.email === email);
    if (existe >= 0) {
      usuarios[existe] = { id: usuarios[existe].id, email, rol };
    } else {
      usuarios.push({ id, email, rol });
    }
    setWebStorage('@resto_usuarios', usuarios);
    return true;
  }

  try {
    await db.runAsync(
      'INSERT OR REPLACE INTO usuarios (id, email, password, rol) VALUES (?, ?, ?, ?)',
      [id, email, password, rol]
    );
    return true;
  } catch (error) {
    console.error("Error guardando usuario:", error);
    return false;
  }
};

export const obtenerUsuarios = async () => {
  if (Platform.OS === 'web' || !db) {
    return getWebStorage('@resto_usuarios', defaultUsuarios);
  }

  try {
    const result = await db.getAllAsync('SELECT id, email, rol FROM usuarios');
    return result;
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return [];
  }
};

export const actualizarUsuarioLocal = async (id, email, rol) => {
  if (Platform.OS === 'web' || !db) {
    let usuarios = getWebStorage('@resto_usuarios', defaultUsuarios);
    usuarios = usuarios.map(u => u.id === id ? { ...u, email, rol } : u);
    setWebStorage('@resto_usuarios', usuarios);
    return true;
  }

  try {
    await db.runAsync(
      'UPDATE usuarios SET email = ?, rol = ? WHERE id = ?',
      [email, rol, id]
    );
    return true;
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    return false;
  }
};


export const crearOrdenLocal = async (nuevaOrden) => {
  if (Platform.OS === 'web' || !db) {
    const ordenes = getWebStorage('@resto_ordenes', []);
    ordenes.unshift(nuevaOrden);
    setWebStorage('@resto_ordenes', ordenes);
    return true;
  }

  try {
    await db.runAsync(
      'INSERT INTO ordenes (id, mesa, items, estado, total, hora) VALUES (?, ?, ?, ?, ?, ?)',
      [nuevaOrden.id, nuevaOrden.mesa, JSON.stringify(nuevaOrden.items), nuevaOrden.estado, nuevaOrden.total, nuevaOrden.hora]
    );
    return true;
  } catch (error) {
    console.error("Error creando orden:", error);
    return false;
  }
};

export const obtenerOrdenes = async () => {
  if (Platform.OS === 'web' || !db) {
    return getWebStorage('@resto_ordenes', []);
  }

  try {
    const rows = await db.getAllAsync('SELECT * FROM ordenes');
    const parsed = rows.map(item => ({
      ...item,
      items: typeof item.items === 'string' ? JSON.parse(item.items) : item.items
    }));
    return parsed;
  } catch (error) {
    console.error("Error obteniendo órdenes:", error);
    return [];
  }
};

export const actualizarEstadoOrden = async (idOrden, nuevoEstado) => {
  if (Platform.OS === 'web' || !db) {
    let ordenes = getWebStorage('@resto_ordenes', []);
    ordenes = ordenes.map(o => o.id === idOrden ? { ...o, estado: nuevoEstado } : o);
    setWebStorage('@resto_ordenes', ordenes);
    return true;
  }

  try {
    await db.runAsync(
      'UPDATE ordenes SET estado = ? WHERE id = ?',
      [nuevoEstado, idOrden]
    );
    return true;
  } catch (error) {
    console.error("Error actualizando estado de la orden:", error);
    return false;
  }
};

// ================= FUNCIONES DE FACTURACIÓN (CAJA) =================

export const guardarFacturaLocal = async (nuevaFactura) => {
  if (Platform.OS === 'web' || !db) {
    const facturas = getWebStorage('@resto_facturas', []);
    facturas.unshift(nuevaFactura);
    setWebStorage('@resto_facturas', facturas);
    
    // Marcar orden como PAGADA
    let ordenes = getWebStorage('@resto_ordenes', []);
    ordenes = ordenes.map(o => o.id === nuevaFactura.ordenId ? { ...o, estado: 'PAGADO' } : o);
    setWebStorage('@resto_ordenes', ordenes);

    return true;
  }

  try {
    await db.runAsync(
      'INSERT INTO facturas (id, ordenId, mesa, total, metodoPago, fecha) VALUES (?, ?, ?, ?, ?, ?)',
      [nuevaFactura.id, nuevaFactura.ordenId, nuevaFactura.mesa, nuevaFactura.total, nuevaFactura.metodoPago, nuevaFactura.fecha]
    );
    await db.runAsync(
      'UPDATE ordenes SET estado = ? WHERE id = ?',
      ['PAGADO', nuevaFactura.ordenId]
    );
    return true;
  } catch (error) {
    console.error("Error guardando factura:", error);
    return false;
  }
};

export const obtenerFacturas = async () => {
  if (Platform.OS === 'web' || !db) {
    return getWebStorage('@resto_facturas', []);
  }

  try {
    const result = await db.getAllAsync('SELECT * FROM facturas');
    return result;
  } catch (error) {
    console.error("Error obteniendo facturas:", error);
    return [];
  }
};