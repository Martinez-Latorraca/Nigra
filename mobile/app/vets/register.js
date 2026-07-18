import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import api from '../../src/lib/api';
import { useTheme } from '../../src/lib/theme';

const SERVICE_SUGGESTIONS = [
  'Consulta general', 'Vacunación', 'Cirugía', 'Emergencias 24h',
  'Peluquería', 'Adopciones',
];

function Field({ label, hint, children, c, required }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[styles.label, { color: c.subtitle }]}>
        {label}
        {required ? <Text style={{ color: '#FF5C6C' }}> *</Text> : null}
      </Text>
      {children}
      {hint ? <Text style={[styles.hint, { color: c.subtitle }]}>{hint}</Text> : null}
    </View>
  );
}

export default function VetRegister() {
  const c = useTheme();
  const user = useSelector((s) => s.user?.data);
  const [checking, setChecking] = useState(true);
  const [form, setForm] = useState({
    name: '', city: '', address: '',
    email: user?.email || '',
    phone: '', whatsapp: '', website: '', instagram: '',
    bio: '',
    services: [],
  });
  const [serviceInput, setServiceInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/vets/me')
      .then(() => router.replace('/vets/dashboard'))
      .catch(() => setChecking(false));
  }, []);

  const update = useCallback((k) => (v) => setForm((f) => ({ ...f, [k]: v })), []);

  const addService = (name) => {
    const clean = String(name).trim();
    if (!clean) return;
    setForm((f) => (f.services.includes(clean) ? f : { ...f, services: [...f.services, clean] }));
    setServiceInput('');
  };
  const removeService = (name) =>
    setForm((f) => ({ ...f, services: f.services.filter((s) => s !== name) }));

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const body = { ...form };
      for (const k of Object.keys(body)) {
        if (body[k] === '' || body[k] === null) delete body[k];
      }
      await api.post('/api/vets', body);
      router.replace('/vets/dashboard');
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo registrar.');
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <SafeAreaView style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.title} />
      </SafeAreaView>
    );
  }

  const inputStyle = [styles.input, { backgroundColor: c.card, color: c.title, borderColor: c.cardBorder }];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={[styles.back, { color: c.subtitle }]}>‹ Directorio</Text>
          </Pressable>

          <Text style={[styles.kicker, { color: c.subtitle }]}>REGISTRO VET</Text>
          <Text style={[styles.title, { color: c.title }]}>Registrá tu veterinaria.</Text>
          <Text style={[styles.subtitle, { color: c.subtitle }]}>
            Los datos institucionales son independientes de tu cuenta personal — el mail acá
            se muestra público, no es tu login. Después de crearla, un admin la aprueba.
          </Text>

          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Field label="Nombre de la veterinaria" required c={c}>
              <TextInput
                style={inputStyle}
                value={form.name}
                onChangeText={update('name')}
                placeholder="Veterinaria Amigo"
                placeholderTextColor={c.subtitle}
                maxLength={120}
              />
            </Field>

            <Field label="Ciudad" c={c}>
              <TextInput
                style={inputStyle}
                value={form.city}
                onChangeText={update('city')}
                placeholder="Montevideo"
                placeholderTextColor={c.subtitle}
                maxLength={80}
              />
            </Field>

            <Field label="Dirección" c={c}>
              <TextInput
                style={inputStyle}
                value={form.address}
                onChangeText={update('address')}
                placeholder="Bv. Artigas 1234"
                placeholderTextColor={c.subtitle}
                maxLength={200}
              />
            </Field>

            <Field
              label="Email de contacto"
              hint="Público, no es tu login."
              c={c}
            >
              <TextInput
                style={inputStyle}
                value={form.email}
                onChangeText={update('email')}
                placeholder="contacto@vetamigo.com"
                placeholderTextColor={c.subtitle}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={150}
              />
            </Field>

            <Field label="Teléfono" c={c}>
              <TextInput
                style={inputStyle}
                value={form.phone}
                onChangeText={update('phone')}
                placeholder="24000000"
                placeholderTextColor={c.subtitle}
                keyboardType="phone-pad"
                maxLength={30}
              />
            </Field>

            <Field label="WhatsApp" hint="Con código de país, sin +." c={c}>
              <TextInput
                style={inputStyle}
                value={form.whatsapp}
                onChangeText={update('whatsapp')}
                placeholder="59899000000"
                placeholderTextColor={c.subtitle}
                keyboardType="phone-pad"
                maxLength={30}
              />
            </Field>

            <Field label="Sitio web" c={c}>
              <TextInput
                style={inputStyle}
                value={form.website}
                onChangeText={update('website')}
                placeholder="https://vetamigo.com"
                placeholderTextColor={c.subtitle}
                autoCapitalize="none"
                keyboardType="url"
                maxLength={200}
              />
            </Field>

            <Field label="Instagram" hint="Sin @" c={c}>
              <TextInput
                style={inputStyle}
                value={form.instagram}
                onChangeText={update('instagram')}
                placeholder="vetamigo"
                placeholderTextColor={c.subtitle}
                autoCapitalize="none"
                maxLength={80}
              />
            </Field>

            <Field label="Bio" hint="Contá quiénes son y qué hacen." c={c}>
              <TextInput
                style={[inputStyle, styles.multiline]}
                value={form.bio}
                onChangeText={update('bio')}
                placeholder="Veterinaria familiar en Pocitos, especialistas en emergencias."
                placeholderTextColor={c.subtitle}
                multiline
                maxLength={2000}
              />
            </Field>

            <Field label="Servicios" hint="Tocá el + o Enter para agregar." c={c}>
              <View style={styles.chipsRow}>
                {form.services.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => removeService(s)}
                    style={[styles.chipActive, { backgroundColor: c.bg }]}
                  >
                    <Text style={[styles.chipActiveText, { color: c.title }]}>{s} ×</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.serviceAddRow}>
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  value={serviceInput}
                  onChangeText={setServiceInput}
                  placeholder="Agregar servicio"
                  placeholderTextColor={c.subtitle}
                  onSubmitEditing={() => addService(serviceInput)}
                  returnKeyType="done"
                  maxLength={80}
                />
                <Pressable
                  onPress={() => addService(serviceInput)}
                  style={[styles.addBtn, { backgroundColor: c.bg }]}
                >
                  <Text style={[styles.addBtnText, { color: c.title }]}>+</Text>
                </Pressable>
              </View>
              <View style={styles.chipsRow}>
                {SERVICE_SUGGESTIONS.filter((s) => !form.services.includes(s)).slice(0, 5).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => addService(s)}
                    style={[styles.chipSuggestion, { borderColor: c.cardBorder }]}
                  >
                    <Text style={[styles.chipSuggestionText, { color: c.subtitle }]}>+ {s}</Text>
                  </Pressable>
                ))}
              </View>
            </Field>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={submit}
              disabled={saving || !form.name.trim()}
              style={[styles.submit, (saving || !form.name.trim()) && { opacity: 0.4 }]}
            >
              <Text style={styles.submitText}>
                {saving ? 'Registrando…' : 'Registrar veterinaria'}
              </Text>
            </Pressable>
            <Text style={[styles.finePrint, { color: c.subtitle }]}>
              Después de crear queda pendiente de aprobación por un admin antes de aparecer en el directorio.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  back: { fontSize: 15, fontWeight: '600' },
  kicker: { fontSize: 10, fontWeight: '700', letterSpacing: 2.5, marginTop: 12 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.8, marginTop: 6 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 10, marginBottom: 24 },
  card: { borderRadius: 24, borderWidth: 1, padding: 20 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 },
  hint: { fontSize: 11, marginTop: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chipActive: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipActiveText: { fontSize: 12, fontWeight: '700' },
  chipSuggestion: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderStyle: 'dashed', borderWidth: 1 },
  chipSuggestionText: { fontSize: 11, fontWeight: '600' },
  serviceAddRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  addBtn: { borderRadius: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 20, fontWeight: '700' },
  errorBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 10, marginTop: 12 },
  errorText: { color: '#DC2626', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  submit: { backgroundColor: '#1A1A2E', borderRadius: 999, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  finePrint: { fontSize: 11, textAlign: 'center', marginTop: 12 },
});
