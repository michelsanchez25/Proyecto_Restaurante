import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { obtenerOrdenes, actualizarEstadoOrden } from '../database/db';
import { obtenerOrdenesApi, actualizarEstadoOrdenApi } from '../services/api';

export default function FacturacionScreen({ navigation, userEmail }) {
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);
  const [historialFacturas, setHistorialFacturas] = useState([]);
  const [vistaActual, setVistaActual] = useState('COBRAR');
  
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDocumento, setClienteDocumento] = useState('');

  useEffect(() => {
    cargarOrdenes();
    const interval = setInterval(cargarOrdenes, 4000);
    return () => clearInterval(interval);
  }, []);

  const cargarOrdenes = async () => {
    // Intentar consultar API online; si falla, usa SQLite local
    const resApi = await obtenerOrdenesApi();
    let data = [];
    if (resApi.success) {
      data = resApi.data || [];
    } else {
      const ordenesLocal = await obtenerOrdenes();
      data = ordenesLocal || [];
    }
    
    // Asegurar que los items de cada orden estén parseados correctamente a objeto/array
    const ordenesProcesadas = data.map(orden => {
      let itemsParsed = orden.items;
      if (typeof itemsParsed === 'string') {
        try {
          itemsParsed = JSON.parse(itemsParsed);
        } catch (e) {
          itemsParsed = [];
        }
      }
      return { ...orden, items: Array.isArray(itemsParsed) ? itemsParsed : [] };
    });

    setOrdenesPendientes(ordenesProcesadas.filter(o => o.estado !== 'PAGADO'));
    setHistorialFacturas(ordenesProcesadas.filter(o => o.estado === 'PAGADO'));
  };

  const handleAbrirFactura = (orden) => {
    setOrdenSeleccionada(orden);
    setMontoRecibido(orden.total ? orden.total.toString() : '0');
    setMetodoPago('Efectivo');
    setClienteNombre('');
    setClienteDocumento('');
    setModalVisible(true);
  };

  const handleProcesarPago = async () => {
    if (!ordenSeleccionada) return;

    const total = parseFloat(ordenSeleccionada.total || 0);
    const entregado = parseFloat(montoRecibido || 0);

    if (metodoPago === 'Efectivo' && entregado < total) {
      Alert.alert('Monto Insuficiente', `El pago recibido ($${entregado}) es menor al total ($${total}).`);
      return;
    }

    const datosFactura = {
      cliente: clienteNombre.trim() || 'Consumidor Final',
      documento: clienteDocumento.trim() || 'S/N',
      metodoPago: metodoPago,
      montoRecibido: entregado,
      cambio: metodoPago === 'Efectivo' ? (entregado - total).toFixed(2) : '0.00',
      fechaPago: new Date().toLocaleString()
    };

    // 1. Intentar actualizar en el servidor online
    await actualizarEstadoOrdenApi(ordenSeleccionada.id, 'PAGADO', datosFactura);

    // 2. Actualizar en SQLite local
    await actualizarEstadoOrden(ordenSeleccionada.id, 'PAGADO', datosFactura);

    setModalVisible(false);

    Alert.alert(
      'Factura emitida con éxito',
      `Factura generada para ${ordenSeleccionada.mesa}\nTotal: $${total}\nMétodo: ${metodoPago}\nCambio: $${datosFactura.cambio}`,
      [
        {
          text: 'Aceptar',
          onPress: () => {
            setOrdenSeleccionada(null);
            setVistaActual('COBRAR');
            cargarOrdenes();
          }
        }
      ]
    );
  };

  const calcularCambio = () => {
    if (!ordenSeleccionada) return 0;
    const total = parseFloat(ordenSeleccionada.total || 0);
    const entregado = parseFloat(montoRecibido || 0);
    const cambio = entregado - total;
    return cambio > 0 ? cambio.toFixed(2) : '0.00';
  };

  return (
    <View style={styles.container}>
      
      {/* ENCABEZADO Y TABS */}
      <View style={styles.header}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.btnTab, vistaActual === 'COBRAR' && styles.btnTabActivo]} 
            onPress={() => setVistaActual('COBRAR')}
          >
            <Text style={[styles.btnTabText, vistaActual === 'COBRAR' && styles.btnTabTextActivo]}>
              Por Cobrar ({ordenesPendientes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.btnTab, vistaActual === 'HISTORIAL' && styles.btnTabActivo]} 
            onPress={() => setVistaActual('HISTORIAL')}
          >
            <Text style={[styles.btnTabText, vistaActual === 'HISTORIAL' && styles.btnTabTextActivo]}>
              Historial Facturas ({historialFacturas.length})
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnActualizar} onPress={cargarOrdenes}>
          <Text style={styles.btnActualizarText}>🔄 Actualizar</Text>
        </TouchableOpacity>
      </View>

      {/* VISTA 1: ÓRDENES POR COBRAR */}
      {vistaActual === 'COBRAR' && (
        <ScrollView contentContainerStyle={styles.gridContainer} keyboardShouldPersistTaps="handled">
          {ordenesPendientes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay órdenes pendientes por cobrar.</Text>
            </View>
          ) : (
            ordenesPendientes.map((orden) => (
              <View key={orden.id} style={styles.cardOrden}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.mesaTitle}>{orden.mesa}</Text>
                    <Text style={styles.horaText}>{orden.hora || 'Reciente'}</Text>
                  </View>
                  <Text style={[
                    styles.badgeEstado,
                    orden.estado === 'LISTO' ? styles.badgeListo : orden.estado === 'PREPARANDO' ? styles.badgePreparando : styles.badgePendiente
                  ]}>
                    {orden.estado}
                  </Text>
                </View>

                <View style={styles.divider} />

                <ScrollView style={styles.itemsScroll} nestedScrollEnabled={true}>
                  {orden.items && orden.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemNombre}>{item.cantidad ? `${item.cantidad}x ` : ''}{item.nombre || item}</Text>
                      <Text style={styles.itemPrecio}>${item.precio || 0}</Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total a Cobrar:</Text>
                  <Text style={styles.totalMonto}>${orden.total}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.btnFacturar}
                  onPress={() => handleAbrirFactura(orden)}
                >
                  <Text style={styles.btnFacturarText}>Facturar y Cobrar</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* VISTA 2: HISTORIAL DE FACTURAS EMITIDAS */}
      {vistaActual === 'HISTORIAL' && (
        <ScrollView contentContainerStyle={styles.gridContainer} keyboardShouldPersistTaps="handled">
          {historialFacturas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se han registrado facturas todavía.</Text>
            </View>
          ) : (
            historialFacturas.map((orden) => (
              <View key={orden.id} style={[styles.cardOrden, styles.cardFacturada]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.mesaTitle}>{orden.mesa}</Text>
                    <Text style={styles.horaText}>Pagado: {orden.factura?.fechaPago || orden.hora}</Text>
                  </View>
                  <Text style={styles.badgePagado}>PAGADO</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoClienteBox}>
                  <Text style={styles.clienteText}>Cliente: {orden.factura?.cliente || 'Consumidor Final'}</Text>
                  <Text style={styles.clienteText}>Método: {orden.factura?.metodoPago || 'Efectivo'}</Text>
                  {orden.factura?.documento ? <Text style={styles.clienteText}>NIT/Doc: {orden.factura.documento}</Text> : null}
                </View>

                <ScrollView style={styles.itemsScroll} nestedScrollEnabled={true}>
                  {orden.items && orden.items.map((item, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <Text style={styles.itemNombre}>{item.cantidad ? `${item.cantidad}x ` : ''}{item.nombre || item}</Text>
                      <Text style={styles.itemPrecio}>${item.precio || 0}</Text>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.divider} />

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Facturado:</Text>
                  <Text style={styles.totalMontoFacturado}>${orden.total}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* MODAL FORMULARIO GENERAR FACTURA */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <Text style={styles.modalTitle}>Generar Factura</Text>
            {ordenSeleccionada && (
              <Text style={styles.modalSubTitle}>{ordenSeleccionada.mesa} • Total: ${ordenSeleccionada.total}</Text>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.labelForm}>Nombre del Cliente (Opcional):</Text>
              <TextInput 
                style={styles.inputForm}
                placeholder="Ej: Juan Pérez / Consumidor Final"
                placeholderTextColor="#888"
                value={clienteNombre}
                onChangeText={setClienteNombre}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.labelForm}>Identificación / RFC / NIT (Opcional):</Text>
              <TextInput 
                style={styles.inputForm}
                placeholder="Ej: 123456789"
                placeholderTextColor="#888"
                value={clienteDocumento}
                onChangeText={setClienteDocumento}
              />
            </View>

            <Text style={styles.labelForm}>Método de Pago:</Text>
            <View style={styles.metodosContainer}>
              {['Efectivo', 'Tarjeta', 'Transferencia'].map((metodo) => (
                <TouchableOpacity
                  key={metodo}
                  style={[styles.btnMetodo, metodoPago === metodo && styles.btnMetodoActivo]}
                  onPress={() => setMetodoPago(metodo)}
                >
                  <Text style={[styles.btnMetodoText, metodoPago === metodo && styles.btnMetodoTextActivo]}>
                    {metodo}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {metodoPago === 'Efectivo' && (
              <View style={styles.efectivoBox}>
                <Text style={styles.labelForm}>Monto Recibido ($):</Text>
                <TextInput 
                  style={styles.inputMonto}
                  keyboardType="numeric"
                  value={montoRecibido}
                  onChangeText={setMontoRecibido}
                />
                <View style={styles.cambioRow}>
                  <Text style={styles.labelCambio}>Cambio a devolver:</Text>
                  <Text style={styles.valCambio}>${calcularCambio()}</Text>
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.btnCancelar} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.btnConfirmarPago} 
                onPress={handleProcesarPago}
              >
                <Text style={styles.btnConfirmarText}>Emitir Factura</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
  },
  tabContainer: { flexDirection: 'row', gap: 8 },
  btnTab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1e293b' },
  btnTabActivo: { backgroundColor: '#2563eb' },
  btnTabText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 13 },
  btnTabTextActivo: { color: '#ffffff' },

  btnActualizar: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  btnActualizarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'flex-start' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#64748b', fontStyle: 'italic' },

  cardOrden: {
    width: 300,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cardFacturada: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mesaTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  horaText: { fontSize: 11, color: '#64748b', marginTop: 2 },

  badgeEstado: { fontSize: 10, fontWeight: 'bold', color: '#ffffff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePendiente: { backgroundColor: '#f59e0b' },
  badgePreparando: { backgroundColor: '#0284c7' },
  badgeListo: { backgroundColor: '#16a34a' },
  badgePagado: { fontSize: 10, fontWeight: 'bold', color: '#ffffff', backgroundColor: '#15803d', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },

  infoClienteBox: { backgroundColor: '#ffffff', padding: 8, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  clienteText: { fontSize: 12, color: '#166534', fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 },

  itemsScroll: { maxHeight: 100 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemNombre: { fontSize: 13, color: '#334155' },
  itemPrecio: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  totalLabel: { fontSize: 13, fontWeight: 'bold', color: '#64748b' },
  totalMonto: { fontSize: 18, fontWeight: 'bold', color: '#16a34a' },
  totalMontoFacturado: { fontSize: 18, fontWeight: 'bold', color: '#15803d' },

  btnFacturar: { backgroundColor: '#16a34a', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnFacturarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', maxWidth: 450, backgroundColor: '#ffffff', borderRadius: 12, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' },
  modalSubTitle: { fontSize: 14, fontWeight: 'bold', color: '#2563eb', textAlign: 'center', marginBottom: 16 },

  formGroup: { marginBottom: 10 },
  labelForm: { fontSize: 12, fontWeight: 'bold', color: '#334155', marginBottom: 4 },
  inputForm: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 8, fontSize: 13, backgroundColor: '#f8fafc', color: '#000' },

  metodosContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
  btnMetodo: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, alignItems: 'center', marginHorizontal: 2, backgroundColor: '#f8fafc' },
  btnMetodoActivo: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  btnMetodoText: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  btnMetodoTextActivo: { color: '#ffffff' },

  efectivoBox: { backgroundColor: '#f0fdf4', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 12 },
  inputMonto: { borderWidth: 1, borderColor: '#86efac', borderRadius: 6, padding: 8, fontSize: 16, fontWeight: 'bold', backgroundColor: '#ffffff', color: '#16a34a' },
  cambioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  labelCambio: { fontSize: 13, fontWeight: 'bold', color: '#166534' },
  valCambio: { fontSize: 18, fontWeight: 'bold', color: '#15803d' },

  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btnCancelar: { backgroundColor: '#64748b', padding: 12, borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center' },
  btnCancelarText: { color: '#fff', fontWeight: 'bold' },
  btnConfirmarPago: { backgroundColor: '#16a34a', padding: 12, borderRadius: 8, flex: 2, alignItems: 'center' },
  btnConfirmarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});