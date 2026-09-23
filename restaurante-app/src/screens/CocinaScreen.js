import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { obtenerOrdenes, actualizarEstadoOrden } from '../database/db';
import { obtenerOrdenesApi, actualizarEstadoOrdenApi } from '../services/api';

export default function CocinaScreen({ navigation, userEmail }) {
  const [ordenes, setOrdenes] = useState([]);

  // Carga inicial y actualización automática cada 4 segundos
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

    // Filtramos para mostrar solo las órdenes que no han sido pagadas aún
    const ordenesActivas = ordenesProcesadas.filter(o => o.estado !== 'PAGADO');
    setOrdenes(ordenesActivas);
  };

  const cambiarEstado = async (idOrden, nuevoEstado) => {
    // 1. Intentar actualizar en el servidor online
    await actualizarEstadoOrdenApi(idOrden, nuevoEstado);

    // 2. Actualizar en SQLite local
    await actualizarEstadoOrden(idOrden, nuevoEstado);

    await cargarOrdenes();
  };

  return (
    <View style={styles.container}>
      
      {/* HEADER DE MONITOR */}
      <View style={styles.header}>
        <Text style={styles.title}>Monitor de Cocina</Text>
        <TouchableOpacity style={styles.btnActualizar} onPress={cargarOrdenes}>
          <Text style={styles.btnActualizarText}>Actualizar Pedidos</Text>
        </TouchableOpacity>
      </View>

      {/* GRID DE PEDIDOS / COMANDAS */}
      <ScrollView contentContainerStyle={styles.gridContainer} keyboardShouldPersistTaps="handled">
        {ordenes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay pedidos pendientes por cocinar en este momento.</Text>
          </View>
        ) : (
          ordenes.map((orden) => (
            <View 
              key={orden.id} 
              style={[
                styles.cardOrden,
                orden.estado === 'LISTO' ? styles.cardListo : orden.estado === 'PREPARANDO' ? styles.cardPreparando : styles.cardPendiente
              ]}
            >
              {/* ENCABEZADO DE LA CARD */}
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

              {/* LISTA DE PLATILLOS DE LA ORDEN */}
              <View style={styles.divider} />
              <ScrollView style={styles.itemsScroll} nestedScrollEnabled={true}>
                {orden.items && orden.items.map((item, idx) => (
                  <Text key={idx} style={styles.itemText}>
                    • <Text style={styles.itemNombre}>{item.nombre || item.cantidad ? `${item.cantidad || 1}x ` : ''}{item.nombre || item}</Text>
                  </Text>
                ))}
              </ScrollView>

              {/* OBSERVACIONES / NOTAS DE MESA */}
              {orden.observaciones ? (
                <View style={styles.notasBox}>
                  <Text style={styles.notasTitle}>Nota:</Text>
                  <Text style={styles.notasText}>{orden.observaciones}</Text>
                </View>
              ) : null}

              {/* BOTONES DE ACCIÓN PARA CAMBIAR ESTADO */}
              <View style={styles.cardFooter}>
                {orden.estado === 'PENDIENTE' && (
                  <TouchableOpacity 
                    style={styles.btnPreparar} 
                    onPress={() => cambiarEstado(orden.id, 'PREPARANDO')}
                  >
                    <Text style={styles.btnText}>En Preparación</Text>
                  </TouchableOpacity>
                )}

                {orden.estado === 'PREPARANDO' && (
                  <TouchableOpacity 
                    style={styles.btnCompletar} 
                    onPress={() => cambiarEstado(orden.id, 'LISTO')}
                  >
                    <Text style={styles.btnText}>Marcar REALIZADA</Text>
                  </TouchableOpacity>
                )}

                {orden.estado === 'LISTO' && (
                  <TouchableOpacity 
                    style={styles.btnListoDisabled} 
                    onPress={() => cambiarEstado(orden.id, 'PREPARANDO')}
                  >
                    <Text style={styles.btnTextListo}>Listo para Entregar (Reabrir)</Text>
                  </TouchableOpacity>
                )}
              </View>

            </View>
          ))
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', padding: 16 },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  btnActualizar: { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnActualizarText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'flex-start' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#64748b', fontStyle: 'italic' },

  cardOrden: {
    width: 310,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    justifyContent: 'space-between',
  },
  cardPendiente: { borderColor: '#f59e0b' },
  cardPreparando: { borderColor: '#0284c7' },
  cardListo: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mesaTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  horaText: { fontSize: 12, color: '#64748b', marginTop: 2 },

  badgeEstado: { fontSize: 10, fontWeight: 'bold', color: '#ffffff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  badgePendiente: { backgroundColor: '#f59e0b' },
  badgePreparando: { backgroundColor: '#0284c7' },
  badgeListo: { backgroundColor: '#16a34a' },

  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 10 },

  itemsScroll: { maxHeight: 150, marginVertical: 4 },
  itemText: { fontSize: 14, color: '#334155', marginBottom: 4 },
  itemNombre: { fontWeight: '600', color: '#0f172a' },

  notasBox: { backgroundColor: '#fef3c7', padding: 8, borderRadius: 6, borderLeftWidth: 3, borderColor: '#d97706', marginTop: 8 },
  notasTitle: { fontSize: 11, fontWeight: 'bold', color: '#92400e' },
  notasText: { fontSize: 12, color: '#78350f' },

  cardFooter: { marginTop: 14 },
  btnPreparar: { backgroundColor: '#0284c7', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnCompletar: { backgroundColor: '#16a34a', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  btnListoDisabled: { backgroundColor: '#dcfce7', paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#86efac' },
  btnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  btnTextListo: { color: '#15803d', fontWeight: 'bold', fontSize: 12 }
});