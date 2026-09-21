import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { 
  agregarPlatilloMenu, 
  actualizarPlatilloMenu, 
  obtenerMenu, 
  guardarUsuarioLocal, 
  obtenerUsuarios, 
  actualizarUsuarioLocal 
} from '../database/db';

export default function AdminScreen({ setModuloActivo }) {
  const [seccionActiva, setSeccionActiva] = useState('menu');

  // --- ESTADOS MENÚ ---
  const [editandoPlatilloId, setEditandoPlatilloId] = useState(null);
  const [nombrePlatillo, setNombrePlatillo] = useState('');
  const [precioPlatillo, setPrecioPlatillo] = useState('');
  const [categoriaPlatillo, setCategoriaPlatillo] = useState('');
  const [menuItems, setMenuItems] = useState([]);

  // --- ESTADOS EMPLEADOS ---
  const [editandoUsuarioId, setEditandoUsuarioId] = useState(null);
  const [emailEmp, setEmailEmp] = useState('');
  const [passEmp, setPassEmp] = useState('');
  const [rolEmp, setRolEmp] = useState('MESERO');
  const [empleados, setEmpleados] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const menuData = await obtenerMenu();
    setMenuItems(menuData || []);

    const usuariosData = await obtenerUsuarios();
    setEmpleados(usuariosData || []);
  };

  const handleGuardarPlatillo = async () => {
    if (!nombrePlatillo.trim() || !precioPlatillo.trim()) {
      return Alert.alert('Atención', 'Ingresa el nombre y precio del platillo');
    }

    if (editandoPlatilloId) {
      await actualizarPlatilloMenu(editandoPlatilloId, nombrePlatillo, precioPlatillo, categoriaPlatillo);
      Alert.alert('Éxito', 'Platillo actualizado correctamente');
    } else {
      await agregarPlatilloMenu(Date.now().toString(), nombrePlatillo, precioPlatillo, categoriaPlatillo);
      Alert.alert('Éxito', 'Platillo agregado al menú');
    }

    limpiarFormularioMenu();
    await cargarDatos();
  };

  const seleccionarPlatilloParaEditar = (item) => {
    setEditandoPlatilloId(item.id);
    setNombrePlatillo(item.nombre);
    setPrecioPlatillo(item.precio.toString());
    setCategoriaPlatillo(item.categoria || '');
  };

  const limpiarFormularioMenu = () => {
    setEditandoPlatilloId(null);
    setNombrePlatillo('');
    setPrecioPlatillo('');
    setCategoriaPlatillo('');
  };

  const handleGuardarEmpleado = async () => {
    if (!emailEmp.trim()) {
      return Alert.alert('Atención', 'Ingresa el correo del empleado');
    }

    if (editandoUsuarioId) {
      await actualizarUsuarioLocal(editandoUsuarioId, emailEmp, rolEmp);
      Alert.alert('Éxito', 'Datos del empleado actualizados');
    } else {
      if (!passEmp.trim()) {
        return Alert.alert('Atención', 'Ingresa una contraseña para el empleado');
      }

      const nuevoId = Date.now().toString();
      await guardarUsuarioLocal(nuevoId, emailEmp, passEmp, rolEmp);
      Alert.alert('Éxito', 'Empleado registrado correctamente');
    }

    limpiarFormularioEmpleado();
    await cargarDatos();
  };

  const seleccionarEmpleadoParaEditar = (emp) => {
    setEditandoUsuarioId(emp.id);
    setEmailEmp(emp.email);
    setRolEmp(emp.rol);
    setPassEmp('');
  };

  const limpiarFormularioEmpleado = () => {
    setEditandoUsuarioId(null);
    setEmailEmp('');
    setPassEmp('');
    setRolEmp('MESERO');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Panel de Administración</Text>

      {/* TABS DE NAVEGACIÓN INTERNA */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, seccionActiva === 'menu' && styles.tabButtonActive]}
          onPress={() => setSeccionActiva('menu')}
        >
          <Text style={[styles.tabText, seccionActiva === 'menu' && styles.tabTextActive]}>🍽️ Menú</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, seccionActiva === 'empleados' && styles.tabButtonActive]}
          onPress={() => setSeccionActiva('empleados')}
        >
          <Text style={[styles.tabText, seccionActiva === 'empleados' && styles.tabTextActive]}>👥 Empleados</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, seccionActiva === 'accesos' && styles.tabButtonActive]}
          onPress={() => setSeccionActiva('accesos')}
        >
          <Text style={[styles.tabText, seccionActiva === 'accesos' && styles.tabTextActive]}>🧭 Módulos</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentArea}>
        {/* PESTAÑA: MENÚ */}
        {seccionActiva === 'menu' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {editandoPlatilloId ? 'Editar Platillo' : '+ Registrar Nuevo Platillo'}
              </Text>
              <TextInput style={styles.input} placeholder="Nombre del Platillo" value={nombrePlatillo} onChangeText={setNombrePlatillo} />
              <TextInput style={styles.input} placeholder="Precio ($)" value={precioPlatillo} onChangeText={setPrecioPlatillo} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Categoría (ej: Bebidas, Comida Rápida)" value={categoriaPlatillo} onChangeText={setCategoriaPlatillo} />

              <TouchableOpacity style={styles.btnPrimary} onPress={handleGuardarPlatillo}>
                <Text style={styles.btnText}>{editandoPlatilloId ? 'Actualizar Platillo' : 'Guardar Platillo'}</Text>
              </TouchableOpacity>

              {editandoPlatilloId && (
                <TouchableOpacity style={styles.btnCancel} onPress={limpiarFormularioMenu}>
                  <Text style={styles.btnCancelText}>Cancelar Edición</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.subTitle}>Carta Actual</Text>
            {menuItems.map((item) => (
              <View key={item.id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.nombre}</Text>
                  <Text style={styles.itemSub}>{item.categoria || 'General'}</Text>
                </View>
                <Text style={styles.itemPrice}>${item.precio}</Text>
                <TouchableOpacity style={styles.btnEditCard} onPress={() => seleccionarPlatilloParaEditar(item)}>
                  <Text style={styles.btnEditCardText}>Editar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* PESTAÑA: EMPLEADOS */}
        {seccionActiva === 'empleados' && (
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {editandoUsuarioId ? 'Editar Datos de Empleado' : 'Registrar Nuevo Empleado'}
              </Text>
              <TextInput style={styles.input} placeholder="Correo electrónico" value={emailEmp} onChangeText={setEmailEmp} autoCapitalize="none" />
              {!editandoUsuarioId && (
                <TextInput style={styles.input} placeholder="Contraseña" secureTextEntry value={passEmp} onChangeText={setPassEmp} />
              )}

              <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Rol asignado:</Text>
              <View style={styles.rolesRow}>
                {['MESERO', 'COCINA', 'CAJA', 'ADMIN'].map((rol) => (
                  <TouchableOpacity
                    key={rol}
                    style={[styles.roleChip, rolEmp === rol && styles.roleChipActive]}
                    onPress={() => setRolEmp(rol)}
                  >
                    <Text style={rolEmp === rol ? styles.roleTextActive : styles.roleText}>{rol}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.btnPrimary} onPress={handleGuardarEmpleado}>
                <Text style={styles.btnText}>{editandoUsuarioId ? 'Actualizar Empleado' : 'Crear Empleado'}</Text>
              </TouchableOpacity>

              {editandoUsuarioId && (
                <TouchableOpacity style={styles.btnCancel} onPress={limpiarFormularioEmpleado}>
                  <Text style={styles.btnCancelText}>Cancelar Edición</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.subTitle}>Personal Registrado</Text>
            {empleados.map((emp) => (
              <View key={emp.id} style={styles.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{emp.email}</Text>
                  <Text style={styles.itemSub}>Rol: {emp.rol}</Text>
                </View>
                <TouchableOpacity style={styles.btnEditCard} onPress={() => seleccionarEmpleadoParaEditar(emp)}>
                  <Text style={styles.btnEditCardText}>Editar</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* PESTAÑA: MÓDULOS */}
        {seccionActiva === 'accesos' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Navegación Directa a Módulos</Text>

            <TouchableOpacity style={styles.btnNav} onPress={() => setModuloActivo('cocina')}>
              <Text style={styles.btnTextNav}>Ir a Cocina</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnNav} onPress={() => setModuloActivo('facturacion')}>
              <Text style={styles.btnTextNav}>Ir a Facturación y Caja</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f4f6f8' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0d47a1', marginBottom: 12, textAlign: 'center' },
  tabContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  tabButton: { flex: 1, paddingVertical: 10, backgroundColor: '#e0e0e0', borderRadius: 8, marginHorizontal: 3, alignItems: 'center' },
  tabButtonActive: { backgroundColor: '#0d47a1' },
  tabText: { fontWeight: 'bold', color: '#424242', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  contentArea: { flex: 1 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 12, elevation: 2, marginBottom: 15 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0d47a1', marginBottom: 12 },
  subTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 5 },
  input: { borderWidth: 1, borderColor: '#cfd8dc', padding: 10, borderRadius: 8, marginBottom: 10, backgroundColor: '#fafafa' },
  btnPrimary: { backgroundColor: '#0d47a1', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  btnText: { color: '#fff', fontWeight: 'bold' },
  btnCancel: { padding: 10, alignItems: 'center', marginTop: 5 },
  btnCancelText: { color: '#d32f2f', fontSize: 13 },
  btnNav: { backgroundColor: '#eceff1', padding: 14, borderRadius: 8, marginTop: 10, borderWidth: 1, borderColor: '#cfd8dc' },
  btnTextNav: { color: '#0d47a1', fontWeight: 'bold', textAlign: 'center', fontSize: 15 },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  itemTitle: { fontWeight: 'bold', fontSize: 14 },
  itemSub: { color: '#666', fontSize: 12 },
  itemPrice: { fontWeight: 'bold', color: '#2e7d32', fontSize: 15, marginRight: 10 },
  btnEditCard: { backgroundColor: '#e8eaf6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#0d47a1' },
  btnEditCardText: { color: '#0d47a1', fontSize: 12, fontWeight: 'bold' },
  rolesRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  roleChip: { padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#cfd8dc', flex: 1, alignItems: 'center', marginHorizontal: 2 },
  roleChipActive: { backgroundColor: '#0d47a1', borderColor: '#0d47a1' },
  roleText: { fontSize: 11, color: '#333' },
  roleTextActive: { fontSize: 11, color: '#fff', fontWeight: 'bold' }
});