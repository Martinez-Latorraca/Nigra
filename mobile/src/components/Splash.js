import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing, Dimensions } from 'react-native';
import { useFonts, DMSans_500Medium } from '@expo-google-fonts/dm-sans';
import MimoLogo from '../../assets/mimo-logo-paw-text.svg';
import Patron from '../../assets/patron-grafico.svg';

// Splash overlay full-screen. Se monta encima del navigator mientras la app
// termina de hidratar. onFinish se dispara cuando terminó la animación de
// salida — el parent puede desmontarlo.
export default function Splash({ onFinish }) {
    const [fontsLoaded] = useFonts({ DMSans_500Medium });

    const logoOpacity = useRef(new Animated.Value(0)).current;
    const logoScale = useRef(new Animated.Value(0.85)).current;
    const taglineOpacity = useRef(new Animated.Value(0)).current;
    const containerOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!fontsLoaded) return;
        const sequence = Animated.sequence([
            Animated.parallel([
                Animated.timing(logoOpacity, {
                    toValue: 1,
                    duration: 850,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(logoScale, {
                    toValue: 1,
                    duration: 1100,
                    easing: Easing.out(Easing.back(1.2)),
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(taglineOpacity, {
                toValue: 1,
                duration: 620,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.delay(1800),
            Animated.timing(containerOpacity, {
                toValue: 0,
                duration: 620,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
        ]);
        sequence.start(({ finished }) => {
            if (finished) onFinish?.();
        });
        return () => sequence.stop();
    }, [fontsLoaded, logoOpacity, logoScale, taglineOpacity, containerOpacity, onFinish]);

    // Sin fuente cargada mostramos solo el fondo crema (sin flash — matchea con
    // el splash nativo). Cuando cargue arranca la animación.
    if (!fontsLoaded) {
        return <View style={styles.root} />;
    }

    const { width, height } = Dimensions.get('window');
    // Patrón anchado al bottom, ligeramente más ancho que la pantalla para full-bleed.
    const patronWidth = width * 1.15;
    const patronHeight = Math.min(patronWidth * (241 / 271), height * 0.42);

    return (
        <Animated.View pointerEvents="none" style={[styles.root, { opacity: containerOpacity }]}>
            <View style={[styles.centerBlock, { paddingBottom: patronHeight }]}>
                <Animated.View
                    style={{
                        opacity: logoOpacity,
                        transform: [{ scale: logoScale }],
                        alignItems: 'center',
                    }}
                >
                    <MimoLogo width={140} height={154} />
                </Animated.View>
                <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
                    Cada mascota merece un mimo
                </Animated.Text>
            </View>
            <View style={styles.patronWrap} pointerEvents="none">
                <Patron
                    width={patronWidth}
                    height={patronHeight}
                    preserveAspectRatio="xMidYEnd slice"
                />
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    root: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFF6F0',
        alignItems: 'center',
        zIndex: 999,
    },
    centerBlock: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    tagline: {
        marginTop: 28,
        fontSize: 17,
        color: '#FF5C6C',
        fontFamily: 'DMSans_500Medium',
        textAlign: 'center',
        letterSpacing: 0.1,
    },
    patronWrap: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
});
