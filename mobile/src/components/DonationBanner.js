import { View, Text, Pressable, StyleSheet, Linking, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { markDismissedTemp, markDismissedPermanent } from '../store/donationSlice';
import { useTheme } from '../lib/theme';

const MP_URL = 'https://link.mercadopago.com.uy/mimouy';

// Banner que aparece en el chat exitoso después de que el dueño marca la
// mascota como reunida. Ofrece un CTA a Mercado Pago + dismissal (temp / "ya doné").
export default function DonationBanner({ petId, petName }) {
    const c = useTheme();
    const dispatch = useDispatch();

    const openDonation = async () => {
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
    };

    const handleLater = () => {
        dispatch(markDismissedTemp(petId));
    };

    return (
        <View style={[styles.wrap, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.title, { color: c.title }]}>
                {petName ? `${petName} ya está en casa 🐾` : '¡Reencuentro exitoso! 🐾'}
            </Text>
            <Text style={[styles.body, { color: c.subtitle }]}>
                Mimo se banca con lo que la comunidad aporta. Si te ayudó, un cafecito
                nos deja seguir conectando familias.
            </Text>
            <Pressable
                onPress={openDonation}
                style={({ pressed }) => [
                    styles.cta,
                    { backgroundColor: c.primary, opacity: pressed ? 0.85 : 1 },
                ]}
            >
                <Text style={[styles.ctaText, { color: c.primaryText }]}>Donar por Mercado Pago</Text>
            </Pressable>
            <View style={styles.footer}>
                <Pressable onPress={handleLater} hitSlop={8}>
                    <Text style={[styles.link, { color: c.subtitle }]}>Ahora no</Text>
                </Pressable>
                <Pressable onPress={handleDonated} hitSlop={8}>
                    <Text style={[styles.link, { color: c.subtitle }]}>Ya doné</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        margin: 16,
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
        gap: 10,
    },
    title: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
    body: { fontSize: 13, lineHeight: 19 },
    cta: {
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 999,
        marginTop: 6,
    },
    ctaText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    link: { fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },
});
