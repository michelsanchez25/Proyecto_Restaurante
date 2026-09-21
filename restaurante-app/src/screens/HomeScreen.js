import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';

// Importación de TODAS las pantallas de los módulos
import AdminScreen from './AdminScreen';
import MeseroScreen from './MeseroScreen';
import CocinaScreen from './CocinaScreen';
import FacturacionScreen from './FacturacionScreen';

export default function HomeScreen({ route, navigation }) {
  const userEmail = route?.params?.userEmail || route?.params?.email || 'mesero@restaurante.com';
  const userRol = route?.params?.rol || 'MESERO';

  // Asignación inteligente del módulo activo según el rol recibido
  const [moduloActivo, setModuloActivo] = useState(() => {
    if (userRol === 'MESERO') return 'mesero';
    if (userRol === 'COCINA') return 'cocina';
    if (userRol === 'CAJA') return 'facturacion';
    return 'admin';
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* ================= NAVBAR GLOBAL PERSISTENTE ================= */}
      <View style={styles.navbar}>
        <View style={styles.brandContainer}>
          <Text style={styles.restaurantName}>MESA Y FAMILIA</Text>
        </View>

        <View style={styles.userContainer}>
          <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
            <Text style={styles.userLabel}>USUARIO EN SESIÓN:</Text>
            <Text style={styles.userName}>{userEmail}</Text>
          </View>
          <TouchableOpacity 
            style={styles.btnLogout} 
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.btnLogoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ================= CONTENIDO SEGÚN ROL ================= */}
      <ScrollView 
        style={styles.scrollArea} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {moduloActivo === 'mesero' && (
          <MeseroScreen 
            navigation={navigation} 
            userEmail={userEmail} 
          />
        )}
        {moduloActivo === 'admin' && (
          <AdminScreen 
            navigation={navigation} 
            userEmail={userEmail} 
            setModuloActivo={setModuloActivo} 
          />
        )}
        {moduloActivo === 'cocina' && (
          <CocinaScreen 
            navigation={navigation} 
            userEmail={userEmail} 
          />
        )}
        {moduloActivo === 'facturacion' && (
          <FacturacionScreen 
            navigation={navigation} 
            userEmail={userEmail} 
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0d47a1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  brandContainer: { flexDirection: 'row', alignItems: 'center' },
  restaurantName: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  userContainer: { flexDirection: 'row', alignItems: 'center' },
  userLabel: { fontSize: 9, color: '#bbdefb', textTransform: 'uppercase' },
  userName: { fontSize: 12, fontWeight: 'bold', color: '#ffffff' },
  btnLogout: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  btnLogoutText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: 40 }
});