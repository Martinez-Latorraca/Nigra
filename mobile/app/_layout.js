import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { store, persistor } from '../src/store/store';
import { SocketProvider } from '../src/lib/socket';
import { SidebarProvider } from '../src/lib/sidebar';
import { PushProvider } from '../src/lib/push';
import BannerHost from '../src/components/BannerHost';
import Splash from '../src/components/Splash';

// Mantenemos el splash nativo (solo bg crema) hasta que el árbol React esté
// listo. En cuanto se monte el layout, lo ocultamos y el componente <Splash />
// toma la posta con su animación (mismo bg, sin flash).
SplashScreen.preventAutoHideAsync().catch(() => {});
// Bg del ReactRootView = crema. Sin esto, el bootstrap muestra negro entre el
// splash nativo y el primer render de RN (especialmente en dev con Metro).
SystemUI.setBackgroundColorAsync('#FFF6F0').catch(() => {});

export default function RootLayout() {
    const [showCustomSplash, setShowCustomSplash] = useState(true);

    const onLayoutRootView = useCallback(async () => {
        try {
            await SplashScreen.hideAsync();
        } catch {
            // Ignoramos si ya estaba oculto o falla — no bloqueamos el render.
        }
    }, []);

    // Handler de fallback: si Splash nunca dispara onFinish (device muy lento,
    // JS crash inesperado), garantizamos que la app quede usable a los 4s.
    useEffect(() => {
        const t = setTimeout(() => setShowCustomSplash(false), 6000);
        return () => clearTimeout(t);
    }, []);

    return (
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <SocketProvider>
                    <PushProvider>
                        <SafeAreaProvider>
                            <View style={{ flex: 1, backgroundColor: '#FFF6F0' }} onLayout={onLayoutRootView}>
                                <StatusBar style="auto" />
                                <SidebarProvider>
                                    <Stack screenOptions={{ headerShown: false }} />
                                    <BannerHost />
                                </SidebarProvider>
                                {showCustomSplash && (
                                    <Splash onFinish={() => setShowCustomSplash(false)} />
                                )}
                            </View>
                        </SafeAreaProvider>
                    </PushProvider>
                </SocketProvider>
            </PersistGate>
        </Provider>
    );
}
