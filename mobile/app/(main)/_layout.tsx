import { Drawer } from 'expo-router/drawer';
import ServerSidebar from '../../src/components/ServerSidebar';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

export default function MainLayout() {
  return (
      <Drawer
        drawerContent={(props) => <ServerSidebar {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#18181b' }, // zinc-900
          headerTintColor: '#fff',
          drawerStyle: {
             backgroundColor: '#18181b',
             width: 80, // Narrow sidebar for icons
          },
          drawerType: 'slide',
          overlayColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            title: 'The Penthouse',
            headerTitleAlign: 'center',
          }}
        />
      </Drawer>
  );
}
