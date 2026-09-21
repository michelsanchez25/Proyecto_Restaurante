import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let db = null;
if (Platform.OS !== 'web') {
  db = SQLite.openDatabase('restaurante_pos.db');
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

// Datos por defecto
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

export const initDB = () => {
  if (Platform.OS === 'web') {
    getWebStorage('@resto_menu', defaultMenu);
    getWebStorage('@resto_usuarios', defaultUsuarios);
    getWebStorage('@resto_ordenes', []);
    getWebStorage('@resto_facturas', []);
    return;
  }

  if (!db) return;

  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS menu (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio REAL NOT NULL,
        categoria TEXT
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        rol TEXT NOT NULL
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS ordenes (
        id TEXT PRIMARY KEY,
        mesa TEXT NOT NULL,
        items TEXT NOT NULL,
        estado TEXT NOT NULL,
        total REAL NOT NULL,
        hora TEXT NOT NULL
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS facturas (
        id TEXT PRIMARY KEY,
        ordenId TEXT NOT NULL,
        mesa TEXT NOT NULL,
        total REAL NOT NULL,
        metodoPago TEXT NOT NULL,
        fecha TEXT NOT NULL
      );`
    );
  });
};

// ================= FUNCIONES DE MENÚ =================

export const agregarPlatilloMenu = (id, nombre, precio, categoria) => {
  return new Promise((resolve) => {
    const nuevoPlatillo = { id, nombre, precio: parseFloat(precio), categoria: categoria || 'General' };
    if (Platform.OS === 'web' || !db) {
      const menu = getWebStorage('@resto_menu', defaultMenu);
      menu.push(nuevoPlatillo);
      setWebStorage('@resto_menu', menu);
      return resolve(true);
    }
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO menu VALUES (?, ?, ?, ?)',
        [id, nombre, parseFloat(precio), categoria || 'General'],
        () => resolve(true)
      );
    });
  });
};

export const actualizarPlatilloMenu = (id, nombre, precio, categoria) => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' || !db) {
      let menu = getWebStorage('@resto_menu', defaultMenu);
      menu = menu.map(item => item.id === id ? { id, nombre, precio: parseFloat(precio), categoria } : item);
      setWebStorage('@resto_menu', menu);
      return resolve(true);
    }
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE menu SET nombre = ?, precio = ?, categoria = ? WHERE id = ?',
        [nombre, parseFloat(precio), categoria || 'General', id],
        () => resolve(true)
      );
    });
  });
};

export const obtenerMenu = () => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' || !db) {
      return resolve(getWebStorage('@resto_menu', defaultMenu));
    }
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM menu', [], (_, { rows }) => resolve(rows._array));
    });
  });
};

// ================= FUNCIONES DE USUARIOS / EMPLEADOS =================

export const guardarUsuarioLocal = (id, email, password, rol) => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' || !db) {
      const usuarios = getWebStorage('@resto_usuarios', defaultUsuarios);
      const existe = usuarios.findIndex(u => u.id === id || u.email === email);
      if (existe >= 0) {
        usuarios[existe] = { id: usuarios[existe].id, email, rol };
      } else {
        usuarios.push({ id, email, rol });
      }
      setWebStorage('@resto_usuarios', usuarios);
      return resolve(true);
    }
    db.transaction(tx => {
      tx.executeSql(
        'INSERT OR REPLACE INTO usuarios (id, email, password, rol) VALUES (?, ?, ?, ?)',
        [id, email, password, rol],
        () => resolve(true)
      );
    });
  });
};

export const obtenerUsuarios = () => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' || !db) {
      return resolve(getWebStorage('@resto_usuarios', defaultUsuarios));
    }
    db.transaction(tx => {
      tx.executeSql('SELECT id, email, rol FROM usuarios', [], (_, { rows }) => resolve(rows._array));
    });
  });
};

export const actualizarUsuarioLocal = (id, email, rol) => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' || !db) {
      let usuarios = getWebStorage('@resto_usuarios', defaultUsuarios);
      usuarios = usuarios.map(u => u.id === id ? { ...u, email, rol } : u);
      setWebStorage('@resto_usuarios', usuarios);
      return resolve(true);
    }
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE usuarios SET email = ?, rol = ? WHERE id = ?',
        [email, rol, id],
        () => resolve(true)
      );
    });
  });
};

// ================= FUNCIONES DE ÓRDENES (MESERO / COCINA) =================

export const crearOrdenLocal = (nuevaOrden) => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' || !db) {
      const ordenes = getWebStorage('@resto_ordenes', []);
      ordenes.unshift(nuevaOrden);
      setWebStorage('@resto_ordenes', ordenes);
      return resolve(true);
    }
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO ordenes VALUES (?, ?, ?, ?, ?, ?)',
        [nuevaOrden.id, nuevaOrden.mesa, JSON.stringify(nuevaOrden.items), nuevaOrden.estado, nuevaOrden.total, nuevaOrden.hora],
        () => resolve(true)
      );
    });
  });
};

export const obtenerOrdenes = () => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' || !db) {
      return resolve(getWebStorage('@resto_ordenes', []));
    }
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM ordenes', [], (_, { rows }) => {
        const parsed = rows._array.map(item => ({
          ...item,
          items: typeof item.items === 'string' ? JSON.parse(item.items) : item.items
        }));
        resolve(parsed);
      });
    });
  });
};

export const actualizarEstadoOrden = (idOrden, nuevoEstado) => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' || !db) {
      let ordenes = getWebStorage('@resto_ordenes', []);
      ordenes = ordenes.map(o => o.id === idOrden ? { ...o, estado: nuevoEstado } : o);
      setWebStorage('@resto_ordenes', ordenes);
      return resolve(true);
    }
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE ordenes SET estado = ? WHERE id = ?',
        [nuevoEstado, idOrden],
        () => resolve(true)
      );
    });
  });
};

// ================= FUNCIONES DE FACTURACIÓN (CAJA) =================

export const guardarFacturaLocal = (nuevaFactura) => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' || !db) {
      const facturas = getWebStorage('@resto_facturas', []);
      facturas.unshift(nuevaFactura);
      setWebStorage('@resto_facturas', facturas);
      
      // Marcar orden como PAGADA
      let ordenes = getWebStorage('@resto_ordenes', []);
      ordenes = ordenes.map(o => o.id === nuevaFactura.ordenId ? { ...o, estado: 'PAGADO' } : o);
      setWebStorage('@resto_ordenes', ordenes);

      return resolve(true);
    }
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO facturas VALUES (?, ?, ?, ?, ?, ?)',
        [nuevaFactura.id, nuevaFactura.ordenId, nuevaFactura.mesa, nuevaFactura.total, nuevaFactura.metodoPago, nuevaFactura.fecha],
        () => {
          tx.executeSql('UPDATE ordenes SET estado = ? WHERE id = ?', ['PAGADO', nuevaFactura.ordenId], () => resolve(true));
        }
      );
    });
  });
};

export const obtenerFacturas = () => {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' || !db) {
      return resolve(getWebStorage('@resto_facturas', []));
    }
    db.transaction(tx => {
      tx.executeSql('SELECT * FROM facturas', [], (_, { rows }) => resolve(rows._array));
    });
  });
};