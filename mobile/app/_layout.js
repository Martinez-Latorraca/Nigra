import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { store, persistor } from '../src/store/store';
import { SocketProvider } from '../src/lib/socket';
import { SidebarProvider } from '../src/lib/sidebar';
import { PushProvider } from '../src/lib/push';
import BannerHost from '../src/components/BannerHost';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SocketProvider>
          <PushProvider>
            <SafeAreaProvider>
              <StatusBar style="auto" />
              <SidebarProvider>
                <Stack screenOptions={{ headerShown: false }} />
                <BannerHost />
              </SidebarProvider>
            </SafeAreaProvider>
          </PushProvider>
        </SocketProvider>
      </PersistGate>
    </Provider>
  );
}
