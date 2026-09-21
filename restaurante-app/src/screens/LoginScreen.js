import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atención', 'Por favor ingresa usuario y contraseña.');
      return;
    }

    const emailClean = email.trim().toLowerCase();

    // 1. ACCESO DIRECTO DE PRUEBAS (Ignora la red)
    if (emailClean === 'admin' || emailClean.includes('admin')) {
      navigation.replace('HomeScreen', { userEmail: 'admin@restaurante.com', rol: 'ADMIN' });
      return;
    } 
    if (emailClean === 'mesero' || emailClean.includes('mesero')) {
      navigation.replace('HomeScreen', { userEmail: 'mesero@restaurante.com', rol: 'MESERO' });
      return;
    } 
    if (emailClean === 'cocina' || emailClean.includes('cocina')) {
      navigation.replace('HomeScreen', { userEmail: 'cocina@restaurante.com', rol: 'COCINA' });
      return;
    } 
    if (emailClean === 'caja' || emailClean.includes('caja')) {
      navigation.replace('HomeScreen', { userEmail: 'caja@restaurante.com', rol: 'CAJA' });
      return;
    }

    // 2. INTENTO DE CONEXIÓN AL BACKEND
    try {
      const res = await fetch('http://10.142.51.187:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailClean, password })
      });

      const data = await res.json();

      if (res.ok) {
        const userRol = data?.user?.rol || 'ADMIN';
        const userMail = data?.user?.email || emailClean;
        navigation.replace('HomeScreen', { userEmail: userMail, rol: userRol });
      } else {
        Alert.alert('Error de Login', data.error || 'Credenciales incorrectas');
      }
    } catch (err) {
      // Si el backend no responde, ingresa automáticamente en modo local
      console.log('Error de conexión con el backend:', err);
      navigation.replace('HomeScreen', { userEmail: emailClean, rol: 'ADMIN' });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RESTAURANTE MESA Y FAMILIA</Text>
      <Text style={styles.subtitle}>Acceso de Personal</Text>

      <View style={styles.card}>
        <TextInput 
          style={styles.input} 
          placeholder="Usuario (admin / mesero / cocina / caja)" 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none" 
        />
        <TextInput 
          style={styles.input} 
          placeholder="Contraseña" 
          secureTextEntry 
          value={password} 
          onChangeText={setPassword} 
        />
        <TouchableOpacity style={styles.btn} onPress={handleLogin}>
          <Text style={styles.btnText}>Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, justifyContent: 'center', backgroundColor: '#eceff1' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0d47a1', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#546e7a', textAlign: 'center', marginBottom: 30 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 3 },
  input: { borderWidth: 1, borderColor: '#cfd8dc', padding: 12, borderRadius: 8, marginBottom: 15, backgroundColor: '#fafafa' },
  btn: { backgroundColor: '#0d47a1', padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});