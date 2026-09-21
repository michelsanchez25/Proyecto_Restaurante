import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { initDB } from './src/database/db';

import LoginScreen from './src/screens/LoginScreen';
import AdminScreen from './src/screens/AdminScreen';
import MeseroScreen from './src/screens/MeseroScreen';
import CocinaScreen from './src/screens/CocinaScreen';
import FacturacionScreen from './src/screens/FacturacionScreen';
import HomeScreen from './src/screens/HomeScreen';

const Stack = createStackNavigator();

export default function App() {
  useEffect(() => {
    // Inicializar la base de datos de manera asíncrona
    const setupDatabase = async () => {
      try {
        await initDB();
      } catch (error) {
        console.error("Error al inicializar la base de datos en App.js:", error);
      }
    };

    setupDatabase();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="HomeScreen" 
          component={HomeScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="AdminScreen" 
          component={AdminScreen} 
          options={{ title: 'Panel Administrador' }} 
        />
        <Stack.Screen 
          name="MeseroScreen" 
          component={MeseroScreen} 
          options={{ title: 'Comanda Digital (Mesero)' }} 
        />
        <Stack.Screen 
          name="CocinaScreen" 
          component={CocinaScreen} 
          options={{ title: 'Pantalla de Cocina' }} 
        />
        <Stack.Screen 
          name="FacturacionScreen" 
          component={FacturacionScreen} 
          options={{ title: 'Facturación y Caja' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}