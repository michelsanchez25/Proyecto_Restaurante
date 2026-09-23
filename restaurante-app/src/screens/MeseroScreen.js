import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { obtenerMenu, obtenerOrdenes, crearOrdenLocal, sincronizarDatosPendientes } from '../database/db';

export default function MeseroScreen({ navigation, route }) {
  const userEmail = route?.params?.userEmail || 'mesero@restaurante.com';
  
  const [menuItems, setMenuItems] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [numMesa, setNumMesa] = useState(1);
  const [observaciones, setObservaciones] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [mostrarSelectorMenu, setMostrarSelectorMenu] = useState(false);

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(() => {
      sincronizarDatosPendientes();
      cargarOrdenes();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const cargarDatos = async () => {
    const menuLocalOApi = await obtenerMenu();
    setMenuItems(menuLocalOApi || []);
    await cargarOrdenes();
  };

  const cargarOrdenes = async () => {
    const ordenesLocal = await obtenerOrdenes();
    setOrdenes(ordenesLocal || []);
  };

  const agregarAlCarrito = (item) => {
    setCarrito((prev) => [...prev, item]);
  };

  const eliminarDelCarrito = (index) => {
    setCarrito((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAbrirFormulario = () => {
    setModalVisible(true);
  };

  const handleConfirmarOrden = async () => {
    if (carrito.length === 0) {
      Alert.alert('Atención', 'Debes incluir al menos un platillo en la comanda.');
      return;
    }

    const totalCalculado = carrito.reduce((sum, item) => sum + parseFloat(item.precio), 0);

    const nuevaOrden = {
      id: Date.now().toString(),
      mesa: `Mesa ${numMesa}`,
      items: carrito,
      observaciones: observaciones.trim(),
      estado: 'PENDIENTE',
      total: totalCalculado,
      hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      const resultado = await crearOrdenLocal(nuevaOrden);

      if (resultado.success) {
        Alert.alert('¡Comanda Registrada!', `La orden para la Mesa ${numMesa} fue enviada con éxito.`);
      } else {
        Alert.alert('Modo Offline', `La orden de la Mesa ${numMesa} se guardó localmente.`);
      }
      
      setCarrito([]);
      setObservaciones('');
      setModalVisible(false);
      setMostrarSelectorMenu(false);
      await cargarOrdenes();

    } catch (error) {
      console.error('❌ Error crítico al confirmar orden:', error);
      Alert.alert('Error', 'No se pudo procesar la comanda.');
    }
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + parseFloat(item.precio), 0);

  const getEstadoEstilo = (estado) => {
    switch (estado) {
      case 'PAGADO': return styles.estadoPagado;
      case 'REALIZADO':
      case 'LISTO': return styles.estadoListo;
      case 'PREPARANDO': return styles.estadoPreparando;
      case 'PENDIENTE':
      default: return styles.estadoPendiente;
    }
  };

  return (
    <View style={styles.container}>
      
      {/* SECCIÓN SUPERIOR: MENÚ */}
      <View style={styles.menuSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>MENÚ DE PLATILLOS</Text>
          <TouchableOpacity onPress={cargarDatos} style={styles.btnActualizar}>
            <Text style={styles.btnActualizarText}>Actualizar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.menuGrid} showsVerticalScrollIndicator={false}>
          {menuItems.length === 0 ? (
            <Text style={styles.emptyText}>No hay platillos registrados en el menú.</Text>
          ) : (
            menuItems.map((item, index) => (
              <TouchableOpacity 
                key={item.id || index} 
                style={styles.cardPlatillo}
                onPress={() => agregarAlCarrito(item)}
              >
                <Text style={styles.nombrePlatillo} numberOfLines={1}>{item.nombre}</Text>
                <Text style={styles.categoriaPlatillo}>{item.categoria || 'General'}</Text>
                <Text style={styles.precioPlatillo}>${item.precio}</Text>
                <Text style={styles.btnAgregarText}>+ Seleccionar</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>

      {/* SECCIÓN INFERIOR: ÓRDENES Y BOTÓN CREAR */}
      <View style={styles.bottomRow}>
        
        <View style={styles.ordenesSection}>
          <Text style={styles.sectionTitle}>ÓRDENES</Text>
          <ScrollView style={styles.scrollOrdenes}>
            {ordenes.length === 0 ? (
              <Text style={styles.emptyText}>No hay órdenes activas.</Text>
            ) : (
              ordenes.map((orden) => (
                <View key={orden.id} style={styles.cardOrden}>
                  <View style={styles.ordenHeader}>
                    <Text style={styles.mesaText}>{orden.mesa}</Text>
                    <Text style={[styles.estadoBadge, getEstadoEstilo(orden.estado)]}>
                      {orden.estado}
                    </Text>
                  </View>
                  <Text style={styles.totalText}>Total: ${orden.total}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        <View style={styles.crearSection}>
          <View style={styles.resumenCrearContainer}>
            <Text style={styles.labelResumen}>Platos agregados:</Text>
            <Text style={styles.cantResumen}>{carrito.length}</Text>
          </View>

          <TouchableOpacity style={styles.btnCrear} onPress={handleAbrirFormulario}>
            <Text style={styles.btnCrearText}>+ CREAR ORDEN</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* MODAL: FORMULARIO CREAR ORDEN */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <Text style={styles.modalTitle}>Formulario de Nueva Orden</Text>

            <View style={styles.formGroup}>
              <Text style={styles.labelForm}>Seleccionar Mesa:</Text>
              <View style={styles.mesaSelectorModal}>
                <TouchableOpacity style={styles.btnMesaStep} onPress={() => setNumMesa(Math.max(1, numMesa - 1))}>
                  <Text style={styles.btnMesaText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.numMesaText}>Mesa {numMesa}</Text>
                <TouchableOpacity style={styles.btnMesaStep} onPress={() => setNumMesa(numMesa + 1)}>
                  <Text style={styles.btnMesaText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.platillosHeaderModal}>
                <Text style={styles.labelForm}>Platillos Seleccionados ({carrito.length}):</Text>
                <TouchableOpacity 
                  style={styles.btnAgregarPlatilloModal}
                  onPress={() => setMostrarSelectorMenu(!mostrarSelectorMenu)}
                >
                  <Text style={styles.btnAgregarPlatilloText}>
                    {mostrarSelectorMenu ? '▲ Ocultar Carta' : '+ Agregar Platillo'}
                  </Text>
                </TouchableOpacity>
              </View>

              {mostrarSelectorMenu && (
                <View style={styles.selectorMenuBox}>
                  <Text style={styles.selectorTitle}>Toca para añadir a la comanda:</Text>
                  <ScrollView style={{ maxHeight: 120 }}>
                    <View style={styles.selectorGrid}>
                      {menuItems.map((item, idx) => (
                        <TouchableOpacity
                          key={item.id || idx}
                          style={styles.btnItemSelector}
                          onPress={() => agregarAlCarrito(item)}
                        >
                          <Text style={styles.itemSelectorNombre}>{item.nombre}</Text>
                          <Text style={styles.itemSelectorPrecio}>${item.precio}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>

            <ScrollView style={styles.modalList}>
              {carrito.length === 0 ? (
                <Text style={styles.emptyTextModal}>No has seleccionado platillos.</Text>
              ) : (
                carrito.map((item, index) => (
                  <View key={index} style={styles.modalItem}>
                    <View>
                      <Text style={styles.modalItemNombre}>{item.nombre}</Text>
                      <Text style={styles.modalItemPrecio}>${item.precio}</Text>
                    </View>
                    <TouchableOpacity onPress={() => eliminarDelCarrito(index)} style={styles.btnEliminarItem}>
                      <Text style={styles.btnEliminarText}>Quitar</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.formGroup}>
              <Text style={styles.labelForm}>Notas / Observaciones:</Text>
              <TextInput 
                style={styles.inputNotas}
                placeholder="Ej: Sin cebolla..."
                placeholderTextColor="#888"
                value={observaciones}
                onChangeText={setObservaciones}
              />
            </View>

            <View style={styles.modalFooter}>
              <Text style={styles.modalTotalText}>Total Orden: ${totalCarrito}</Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalVisible(false)}>
                  <Text style={styles.btnCancelarText}>Cerrar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnEnviarCocina} onPress={handleConfirmarOrden}>
                  <Text style={styles.btnEnviarText}>Confirmar y Enviar</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f1f5f9' },
  menuSection: { flex: 3, backgroundColor: '#1e3a8a', borderRadius: 12, padding: 10, marginBottom: 10, elevation: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#ffffff' },
  btnActualizar: { backgroundColor: '#2563eb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  btnActualizarText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardPlatillo: { backgroundColor: '#ffffff', width: '31%', minHeight: 90, padding: 8, borderRadius: 8, marginBottom: 8, elevation: 2, justifyContent: 'space-between' },
  nombrePlatillo: { fontWeight: 'bold', fontSize: 13, color: '#0f172a' },
  categoriaPlatillo: { fontSize: 10, color: '#64748b' },
  precioPlatillo: { fontSize: 13, fontWeight: 'bold', color: '#16a34a' },
  btnAgregarText: { fontSize: 10, color: '#2563eb', fontWeight: 'bold' },
  bottomRow: { flex: 2, flexDirection: 'row', justifyContent: 'space-between' },
  ordenesSection: { flex: 2, backgroundColor: '#334155', borderRadius: 12, padding: 10, marginRight: 8, elevation: 4 },
  scrollOrdenes: { flex: 1, marginTop: 6 },
  cardOrden: { backgroundColor: '#ffffff', padding: 8, borderRadius: 8, marginBottom: 6 },
  ordenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mesaText: { fontWeight: 'bold', fontSize: 12, color: '#0f172a' },
  estadoBadge: { fontSize: 9, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, color: '#fff', fontWeight: 'bold' },
  estadoPendiente: { backgroundColor: '#f59e0b' },
  estadoPreparando: { backgroundColor: '#0284c7' },
  estadoListo: { backgroundColor: '#16a34a' },
  estadoPagado: { backgroundColor: '#8b5cf6' },
  totalText: { fontSize: 11, color: '#475569', marginTop: 2 },
  crearSection: { flex: 1, justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 12, elevation: 4, borderWidth: 1, borderColor: '#cbd5e1' },
  resumenCrearContainer: { alignItems: 'center', marginTop: 4 },
  labelResumen: { fontSize: 11, color: '#64748b', fontWeight: 'bold' },
  cantResumen: { fontSize: 28, fontWeight: 'bold', color: '#1e3a8a', marginTop: 2 },
  btnCrear: { backgroundColor: '#2563eb', width: '100%', paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnCrearText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, elevation: 999 },
  modalContent: { width: '90%', maxHeight: '85%', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 5 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
  formGroup: { marginBottom: 8 },
  labelForm: { fontSize: 12, fontWeight: 'bold', color: '#334155' },
  mesaSelectorModal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 4, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1', marginTop: 4 },
  btnMesaStep: { backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 2, borderRadius: 6 },
  btnMesaText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  numMesaText: { fontSize: 14, fontWeight: 'bold', marginHorizontal: 14, color: '#0f172a' },
  platillosHeaderModal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  btnAgregarPlatilloModal: { backgroundColor: '#2563eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  btnAgregarPlatilloText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  selectorMenuBox: { backgroundColor: '#f1f5f9', padding: 6, borderRadius: 8, borderWidth: 1, borderColor: '#93c5fd', marginBottom: 6 },
  selectorTitle: { fontSize: 10, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 4 },
  selectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  btnItemSelector: { backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', flexDirection: 'row', gap: 4 },
  itemSelectorNombre: { fontSize: 11, fontWeight: 'bold', color: '#1e293b' },
  itemSelectorPrecio: { fontSize: 11, color: '#16a34a', fontWeight: 'bold' },
  modalList: { maxHeight: 110, marginBottom: 6 },
  emptyTextModal: { color: '#64748b', fontStyle: 'italic', fontSize: 11, textAlign: 'center', marginVertical: 6 },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 6, borderRadius: 6, marginBottom: 4, borderWidth: 1, borderColor: '#e2e8f0' },
  modalItemNombre: { fontWeight: 'bold', fontSize: 12, color: '#1e293b' },
  modalItemPrecio: { fontSize: 11, color: '#16a34a', fontWeight: 'bold' },
  btnEliminarItem: { backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  btnEliminarText: { color: '#dc2626', fontSize: 10, fontWeight: 'bold' },
  inputNotas: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 6, fontSize: 12, backgroundColor: '#f8fafc', marginTop: 2 },
  modalFooter: { marginTop: 6, borderTopWidth: 1, borderColor: '#e2e8f0', paddingTop: 6 },
  modalTotalText: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', textAlign: 'right', marginBottom: 6 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btnCancelar: { backgroundColor: '#64748b', padding: 8, borderRadius: 8, flex: 1, marginRight: 6, alignItems: 'center' },
  btnCancelarText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  btnEnviarCocina: { backgroundColor: '#16a34a', padding: 8, borderRadius: 8, flex: 2, alignItems: 'center' },
  btnEnviarText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});