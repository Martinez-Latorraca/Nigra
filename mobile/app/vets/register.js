import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '../../src/lib/api';
import { useTheme, palette, fonts } from '../../src/lib/theme';
import SectionHeader from '../../src/components/SectionHeader';
import FormField from '../../src/components/FormField';
import Button from '../../src/components/Button';
import ServiceChips, { useServices } from '../../src/components/ServiceChips';
import { Globe, Info, MapPin, MessageCircle, Phone, Stethoscope } from '../../src/lib/icons';

export default function VetRegister() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({
    name: '', city: '', address: '',
    phone: '', whatsapp: '', website: '', instagram: '',
    bio: '',
  });
  const services = useServices();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/vets/me')
      .then(() => router.replace('/profile'))
      .catch(() => setChecking(false));
  }, []);

  const update = useCallback((k) => (v) => setForm((f) => ({ ...f, [k]: v })), []);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const body = { ...form, services: services.toList() };
      for (const k of Object.keys(body)) {
        if (body[k] === '' || body[k] === null) delete body[k];
      }
      await api.post('/api/vets', body);
      router.replace('/profile');
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo registrar.');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <View style={[styles.flex, styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.flex, { backgroundColor: c.bg }]}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          color={palette.noche}
          centerLabel="Registro vet"
          title="Registrá tu veterinaria"
          subtitle="Completá los datos que se mostrarán en el directorio público."
        />

        <View style={styles.body}>
          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.title }]}>La clínica</Text>
            <FormField
              label="Nombre de la veterinaria"
              required
              icon={Stethoscope}
              value={form.name}
              onChangeText={update('name')}
              placeholder="Veterinaria Amigo"
              maxLength={120}
            />
            <FormField
              label="Ciudad"
              icon={MapPin}
              value={form.city}
              onChangeText={update('city')}
              placeholder="Montevideo"
              maxLength={80}
            />
            <FormField
              label="Dirección"
              icon={MapPin}
              value={form.address}
              onChangeText={update('address')}
              placeholder="Bv. Artigas 1234"
              maxLength={200}
            />
          </View>

          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.title }]}>Contacto</Text>
            <FormField
              label="Teléfono"
              icon={Phone}
              value={form.phone}
              onChangeText={update('phone')}
              placeholder="24000000"
              keyboardType="phone-pad"
              maxLength={30}
            />
            <FormField
              label="WhatsApp"
              icon={MessageCircle}
              value={form.whatsapp}
              onChangeText={update('whatsapp')}
              placeholder="59899000000"
              keyboardType="phone-pad"
              maxLength={30}
              hint="Con código de país, sin +."
            />
            <FormField
              label="Sitio web"
              icon={Globe}
              value={form.website}
              onChangeText={update('website')}
              placeholder="https://vetamigo.com"
              autoCapitalize="none"
              keyboardType="url"
              maxLength={200}
            />
            <FormField
              label="Instagram"
              prefix="@"
              value={form.instagram}
              onChangeText={update('instagram')}
              placeholder="vetamigo"
              autoCapitalize="none"
              maxLength={80}
            />
          </View>

          <View style={[styles.card, { backgroundColor: c.card }]}>
            <Text style={[styles.cardTitle, { color: c.title }]}>Sobre ustedes</Text>
            <FormField
              label="Bio"
              value={form.bio}
              onChangeText={update('bio')}
              placeholder="Veterinaria familiar en Pocitos, especialistas en emergencias."
              multiline
              maxLength={2000}
            />
            <ServiceChips services={services} otherPlaceholder="Homeopatía, Nutrición, Odontología…" />
          </View>

          {error ? <Text style={[styles.error, { color: c.coral }]}>{error}</Text> : null}

          <Button
            variant="dark"
            title="Registrar veterinaria"
            onPress={submit}
            loading={saving}
            disabled={!form.name.trim()}
          />
          <View style={styles.noteRow}>
            <Info size={16} color={c.text} strokeWidth={2} />
            <Text style={[styles.note, { color: c.text }]}>
              Después de crear queda pendiente de aprobación por un admin antes de aparecer en el directorio.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingTop: 20, gap: 16 },
  card: { borderRadius: 24, padding: 18, gap: 14 },
  cardTitle: { fontFamily: fonts.display, fontSize: 18 },
  error: { fontFamily: fonts.bold, fontSize: 13, textAlign: 'center' },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  note: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
});
