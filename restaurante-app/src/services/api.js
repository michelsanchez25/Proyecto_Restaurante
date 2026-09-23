const API_URL = 'http://10.43.56.11:3000/api';

// ==============================
// 1. AUTENTICACIÓN / USUARIOS
// ==============================

// Función de Login
export const loginApi = async (email, password) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error al iniciar sesión');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Obtener lista de usuarios/empleados desde el backend
export const obtenerUsuariosApi = async () => {
  try {
    const response = await fetch(`${API_URL}/usuarios`);
    const data = await response.json();
    if (!response.ok) throw new Error('Error al obtener usuarios');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Registrar un nuevo empleado en el backend
export const registrarUsuarioApi = async (nuevoUsuario) => {
  try {
    const response = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoUsuario)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo registrar el usuario');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Actualizar datos de un empleado en el backend
export const actualizarUsuarioApi = async (id, datosActualizados) => {
  try {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosActualizados)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el usuario');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};


// ==============================
// 2. MENÚ Y PLATILLOS
// ==============================

// Obtener menú desde el backend (PostgreSQL)
export const obtenerMenuApi = async () => {
  try {
    const response = await fetch(`${API_URL}/menu`);
    const data = await response.json();
    if (!response.ok) throw new Error('Error al obtener menú');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Agregar un nuevo platillo al menú del backend
export const agregarPlatilloMenuApi = async (platillo) => {
  try {
    const response = await fetch(`${API_URL}/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(platillo)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo agregar el platillo');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Actualizar un platillo existente en el backend
export const actualizarPlatilloMenuApi = async (id, platillo) => {
  try {
    const response = await fetch(`${API_URL}/menu/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(platillo)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el platillo');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};


// ==============================
// 3. ÓRDENES / COMANDAS
// ==============================

// Obtener órdenes desde el backend
export const obtenerOrdenesApi = async () => {
  try {
    const response = await fetch(`${API_URL}/ordenes`);
    const data = await response.json();
    if (!response.ok) throw new Error('Error al obtener órdenes');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Crear orden enviándola al backend
export const crearOrdenApi = async (nuevaOrden) => {
  try {
    const response = await fetch(`${API_URL}/ordenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevaOrden)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo crear la orden');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Actualizar el estado de una orden en el backend (ej. PENDIENTE -> PREPARANDO -> LISTO -> PAGADO)
export const actualizarEstadoOrdenApi = async (idOrden, nuevoEstado) => {
  try {
    const response = await fetch(`${API_URL}/ordenes/${idOrden}/estado`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el estado de la orden');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};