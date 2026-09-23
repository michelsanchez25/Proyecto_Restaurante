import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

let db = null;

// Inicialización segura de la base de datos asíncrona para Expo SQLite moderno
const getDB = async () => {
  if (Platform.OS === 'web') return null;
  if (!db) {
    db = await SQLite.openDatabaseAsync('restaurante_pos.db');
  }
  return db;
};

const API_URL = 'http://10.43.56.11:3000/api';

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
  { id: '1790168614978', nombre: 'Perro Caliente', precio: 16000, categoria: 'Comida Rapida' },
  { id: '1790169792425', nombre: 'Pizza Personal', precio: 18000, categoria: 'Comida Rapida' },
  { id: '1790168497923', nombre: 'Hamburguesa', precio: 23000, categoria: 'Comida Rapida' },
  { id: '1790170983466', nombre: 'Lasaña', precio: 18000, categoria: 'Comida Rapida' },
  { id: '1790174199450', nombre: 'Salchipapa Pequeña', precio: 15000, categoria: 'Comida Rapida' },
  { id: '1790177287350', nombre: 'Gaseosa', precio: 5000, categoria: 'Bebidas' }
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

  try {
    const database = await getDB();
    if (!database) return;

    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS menu (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        categoria TEXT,
        sincronizado INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        rol TEXT NOT NULL,
        sincronizado INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS ordenes (
        id TEXT PRIMARY KEY,
        mesa TEXT NOT NULL,
        items TEXT NOT NULL,
        estado TEXT NOT NULL,
        total REAL NOT NULL,
        hora TEXT NOT NULL,
        sincronizado INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS facturas (
        id TEXT PRIMARY KEY,
        ordenId TEXT NOT NULL,
        mesa TEXT NOT NULL,
        total REAL NOT NULL,
        metodoPago TEXT NOT NULL,
        fecha TEXT NOT NULL,
        sincronizado INTEGER DEFAULT 0
      );
    `);
    console.log("📁 Base de datos SQLite inicializada correctamente.");
  } catch (error) {
    console.error("Error inicializando la base de datos:", error);
  }
};

// ================= FUNCIONES DE MENÚ =================

export const agregarPlatilloMenu = async (id, nombre, precio, categoria) => {
  const nuevoPlatillo = { id, nombre, precio: parseFloat(precio), categoria: categoria || 'General' };
  
  if (Platform.OS === 'web') {
    const menu = getWebStorage('@resto_menu', defaultMenu);
    menu.push(nuevoPlatillo);
    setWebStorage('@resto_menu', menu);
    return true;
  }

  try {
    const database = await getDB();
    await database.runAsync(
      'INSERT INTO menu (id, nombre, precio, categoria, sincronizado) VALUES (?, ?, ?, ?, 0)',
      [id, nombre, parseFloat(precio), categoria || 'General']
    );
    sincronizarDatosPendientes();
    return true;
  } catch (error) {
    console.error("Error agregando platillo:", error);
    return false;
  }
};

export const actualizarPlatilloMenu = async (id, nombre, precio, categoria) => {
  if (Platform.OS === 'web') {
    let menu = getWebStorage('@resto_menu', defaultMenu);
    menu = menu.map(item => item.id === id ? { id, nombre, precio: parseFloat(precio), categoria } : item);
    setWebStorage('@resto_menu', menu);
    return true;
  }

  try {
    const database = await getDB();
    await database.runAsync(
      'UPDATE menu SET nombre = ?, precio = ?, categoria = ?, sincronizado = 0 WHERE id = ?',
      [nombre, parseFloat(precio), categoria || 'General', id]
    );
    sincronizarDatosPendientes();
    return true;
  } catch (error) {
    console.error("Error actualizando platillo:", error);
    return false;
  }
};

export const obtenerMenu = async () => {
  if (Platform.OS === 'web') {
    return getWebStorage('@resto_menu', defaultMenu);
  }

  const state = await NetInfo.fetch();
  if (state.isConnected) {
    try {
      const response = await fetch(`${API_URL}/menu`, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const menuServer = await response.json();
        const database = await getDB();
        for (let plato of menuServer) {
          await database.runAsync(
            'INSERT OR REPLACE INTO menu (id, nombre, precio, categoria, sincronizado) VALUES (?, ?, ?, ?, 1)',
            [plato.id, plato.nombre, plato.precio, plato.categoria || 'General']
          );
        }
        return menuServer;
      }
    } catch (apiError) {
      console.log("⚠️ Backend sin conexión. Leyendo menú local...");
    }
  }

  try {
    const database = await getDB();
    const result = await database.getAllAsync('SELECT * FROM menu');
    return result && result.length > 0 ? result : defaultMenu;
  } catch (error) {
    console.error("Error obteniendo menú local:", error);
    return defaultMenu;
  }
};

// ================= FUNCIONES DE USUARIOS / EMPLEADOS =================

export const guardarUsuarioLocal = async (id, email, password, rol) => {
  if (Platform.OS === 'web') {
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
    const database = await getDB();
    await database.runAsync(
      'INSERT OR REPLACE INTO usuarios (id, email, password, rol, sincronizado) VALUES (?, ?, ?, ?, 0)',
      [id, email, password, rol]
    );
    sincronizarDatosPendientes();
    return true;
  } catch (error) {
    console.error("Error guardando usuario:", error);
    return false;
  }
};

export const obtenerUsuarios = async () => {
  if (Platform.OS === 'web') {
    return getWebStorage('@resto_usuarios', defaultUsuarios);
  }

  try {
    const database = await getDB();
    return await database.getAllAsync('SELECT id, email, rol FROM usuarios');
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return [];
  }
};

// ================= FUNCIONES DE ÓRDENES =================

export const crearOrdenLocal = async (nuevaOrden) => {
  const itemsFormatted = typeof nuevaOrden.items === 'string' ? nuevaOrden.items : JSON.stringify(nuevaOrden.items);
  let enviadoAPostgres = false;

  const state = await NetInfo.fetch();
  if (state.isConnected) {
    try {
      const response = await fetch(`${API_URL}/ordenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nuevaOrden,
          items: itemsFormatted 
        })
      });

      if (response.ok) {
        enviadoAPostgres = true;
        console.log('🌐 ✅ Orden enviada y guardada en PostgreSQL con éxito.');
      } else {
        const errorData = await response.json();
        console.error('❌ El servidor backend rechazó la orden:', errorData);
      }
    } catch (apiError) {
      console.log('⚠️ Error de red con la API de Postgres:', apiError.message);
    }
  }

  const estadoSincronizacion = enviadoAPostgres ? 1 : 0;

  if (Platform.OS === 'web') {
    const ordenes = getWebStorage('@resto_ordenes', []);
    ordenes.unshift({ ...nuevaOrden, items: itemsFormatted });
    setWebStorage('@resto_ordenes', ordenes);
  } else {
    try {
      const database = await getDB();
      await database.runAsync(
        'INSERT OR REPLACE INTO ordenes (id, mesa, items, estado, total, hora, sincronizado) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [nuevaOrden.id, nuevaOrden.mesa, itemsFormatted, nuevaOrden.estado, nuevaOrden.total, nuevaOrden.hora, estadoSincronizacion]
      );
      console.log(`📱 Orden guardada en SQLite local (sincronizado: ${estadoSincronizacion}).`);
    } catch (dbError) {
      console.error("❌ Error guardando orden en SQLite:", dbError);
      return { success: false, message: 'Error interno guardando localmente' };
    }
  }

  return { 
    success: true, // Siempre devolvemos true para que la UI no se bloquee; si falló red, queda guardado localmente para sincronizar después.
    message: enviadoAPostgres ? 'Guardado en servidor online' : 'Guardado localmente (Offline)' 
  };
};

export const obtenerOrdenes = async () => {
  if (Platform.OS === 'web') {
    return getWebStorage('@resto_ordenes', []);
  }

  try {
    const database = await getDB();
    return await database.getAllAsync('SELECT * FROM ordenes ORDER BY hora DESC');
  } catch (error) {
    console.error("Error obteniendo órdenes:", error);
    return [];
  }
};

export const actualizarEstadoOrden = async (idOrden, nuevoEstado) => {
  if (Platform.OS === 'web') {
    let ordenes = getWebStorage('@resto_ordenes', []);
    ordenes = ordenes.map(o => o.id === idOrden ? { ...o, estado: nuevoEstado } : o);
    setWebStorage('@resto_ordenes', ordenes);
    return true;
  }

  try {
    const database = await getDB();
    await database.runAsync(
      'UPDATE ordenes SET estado = ?, sincronizado = 0 WHERE id = ?',
      [nuevoEstado, idOrden]
    );

    const state = await NetInfo.fetch();
    if (state.isConnected) {
      try {
        const response = await fetch(`${API_URL}/ordenes/${idOrden}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: nuevoEstado })
        });
        if (response.ok) {
          await database.runAsync('UPDATE ordenes SET sincronizado = 1 WHERE id = ?', [idOrden]);
        }
      } catch (e) {
        // Se mantendrá pendiente para la próxima sincronización
      }
    }

    return true;
  } catch (error) {
    console.error("Error actualizando estado de la orden:", error);
    return false;
  }
};

// ================= FUNCIONES DE FACTURACIÓN =================

export const guardarFacturaLocal = async (nuevaFactura) => {
  let enviadoAPostgres = false;
  const state = await NetInfo.fetch();

  if (state.isConnected) {
    try {
      const response = await fetch(`${API_URL}/facturas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaFactura)
      });

      if (response.ok) {
        enviadoAPostgres = true;
      }
    } catch (apiError) {
      console.log('⚠️ Error de red al registrar factura:', apiError.message);
    }
  }

  const estadoSincronizacion = enviadoAPostgres ? 1 : 0;

  if (Platform.OS === 'web') {
    const facturas = getWebStorage('@resto_facturas', []);
    facturas.unshift(nuevaFactura);
    setWebStorage('@resto_facturas', facturas);
    
    let ordenes = getWebStorage('@resto_ordenes', []);
    ordenes = ordenes.map(o => o.id === nuevaFactura.ordenId ? { ...o, estado: 'PAGADO' } : o);
    setWebStorage('@resto_ordenes', ordenes);
    return true;
  }

  try {
    const database = await getDB();
    await database.runAsync(
      'INSERT OR REPLACE INTO facturas (id, ordenId, mesa, total, metodoPago, fecha, sincronizado) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nuevaFactura.id, nuevaFactura.ordenId, nuevaFactura.mesa, nuevaFactura.total, nuevaFactura.metodoPago, nuevaFactura.fecha, estadoSincronizacion]
    );
    await database.runAsync(
      'UPDATE ordenes SET estado = ?, sincronizado = 0 WHERE id = ?',
      ['PAGADO', nuevaFactura.ordenId]
    );
    sincronizarDatosPendientes();
    return true;
  } catch (error) {
    console.error("Error guardando factura localmente:", error);
    return false;
  }
};

export const obtenerFacturas = async () => {
  if (Platform.OS === 'web') {
    return getWebStorage('@resto_facturas', []);
  }

  try {
    const database = await getDB();
    return await database.getAllAsync('SELECT * FROM facturas ORDER BY fecha DESC');
  } catch (error) {
    console.error("Error obteniendo facturas:", error);
    return [];
  }
};

// ================= SINCRONIZACIÓN AUTOMÁTICA =================

export const sincronizarDatosPendientes = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected || Platform.OS === 'web') return;

  try {
    const database = await getDB();
    const menuPendientes = await database.getAllAsync('SELECT * FROM menu WHERE sincronizado = 0');
    const empleadosPendientes = await database.getAllAsync('SELECT * FROM usuarios WHERE sincronizado = 0');
    const pedidosPendientes = await database.getAllAsync('SELECT * FROM ordenes WHERE sincronizado = 0');
    const facturasPendientes = await database.getAllAsync('SELECT * FROM facturas WHERE sincronizado = 0');

    if (
      menuPendientes.length === 0 &&
      empleadosPendientes.length === 0 &&
      pedidosPendientes.length === 0 &&
      facturasPendientes.length === 0
    ) {
      return;
    }

    const response = await fetch(`${API_URL}/sincronizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productos: menuPendientes,
        empleados: empleadosPendientes,
        pedidos: pedidosPendientes,
        facturas: facturasPendientes
      })
    });

    if (response.ok) {
      await database.runAsync('UPDATE menu SET sincronizado = 1 WHERE sincronizado = 0');
      await database.runAsync('UPDATE usuarios SET sincronizado = 1 WHERE sincronizado = 0');
      await database.runAsync('UPDATE ordenes SET sincronizado = 1 WHERE sincronizado = 0');
      await database.runAsync('UPDATE facturas SET sincronizado = 1 WHERE sincronizado = 0');
      console.log('✅ ¡Sincronización masiva con PostgreSQL completada con éxito!');
    }
  } catch (error) {
    console.log('⚠️ Sin conexión con la API backend.');
  }
};