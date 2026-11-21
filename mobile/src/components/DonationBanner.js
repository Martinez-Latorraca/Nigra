import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { markDismissedTemp, markDismissedPermanent } from '../store/donationSlice';
import { palette, fonts } from '../lib/theme';
import { Coffee } from '../lib/icons';
import api from '../lib/api';
import { MP_DONATION_URL as MP_URL } from '../lib/config';

// Banner que aparece en el chat exitoso después de que el dueño marca la
// mascota como reunida. Ofrece un CTA a Mercado Pago + dismissal (temp / "ya doné").
// onDismiss (opcional): se llama después de "Ahora no" / "Ya doné" — sirve
// para cerrar el modal de celebración que envuelve el banner.
export default function DonationBanner({ petId, petName, onDismiss, style }) {
    const dispatch = useDispatch();

    const openDonation = async () => {
        // Fire-and-forget: registra el click (el interceptor de api agrega el
        // token si hay sesión). No await para no demorar la apertura de MP.
        api.post('/api/donations/click', { pet_id: petId ?? null }).catch(() => {});
        try {
            const supported = await Linking.canOpenURL(MP_URL);
            if (!supported) {
                Alert.alert('No se pudo abrir el link', 'Intentá abrirlo manualmente: ' + MP_URL);
                return;
            }
            await Linking.openURL(MP_URL);
        } catch (e) {
            Alert.alert('Error', 'No se pudo abrir el link de donación.');
        }
    };

    const handleDonated = () => {
        dispatch(markDismissedPermanent(petId));
        onDismiss?.();
    };

    const handleLater = () => {
        dispatch(markDismissedTemp(petId));
        onDismiss?.();
    };

    return (
        <View style={[styles.wrap, style]}>
            <View style={styles.head}>
                <View style={styles.icon}>
                    <Coffee size={22} color={palette.arena} strokeWidth={2} />
                </View>
                <Text style={styles.title}>
                    {petName ? `${petName} ya está en casa` : '¡Reencuentro exitoso!'}
                </Text>
            </View>
            <Text style={styles.body}>
                Mimo se banca con lo que la comunidad aporta. Si te ayudó, un cafecito
                nos deja seguir conectando familias.
            </Text>
            <Pressable
                onPress={openDonation}
                style={({ pressed }) => [styles.cta, { opacity: pressed ? 0.85 : 1 }]}
            >
                <Text style={styles.ctaText}>Donar por Mercado Pago</Text>
            </Pressable>
            <View style={styles.footer}>
                <Pressable onPress={handleLater} hitSlop={8}>
                    <Text style={styles.link}>Ahora no</Text>
                </Pressable>
                <Pressable onPress={handleDonated} hitSlop={8}>
                    <Text style={styles.link}>Ya doné</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        alignSelf: 'stretch',
        backgroundColor: palette.coral,
        borderRadius: 24,
        padding: 18,
        gap: 10,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    icon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { flex: 1, fontFamily: fonts.display, fontSize: 18, lineHeight: 22, color: palette.arena },
    body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: palette.arena },
    cta: {
        height: 48,
        borderRadius: 14,
        backgroundColor: palette.noche,
        alignItems: 'center',
        justifyContent: 'center',
    },
    ctaText: { fontFamily: fonts.bold, fontSize: 15, color: palette.crema },
    footer: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
    link: { fontFamily: fonts.bold, fontSize: 13, color: palette.arena, textDecorationLine: 'underline', padding: 4 },
});
