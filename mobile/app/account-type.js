// Pregunta el tipo de cuenta UNA sola vez, justo después del primer login
// social. Es el único camino de alta donde no se puede preguntar antes: el
// proveedor (Google/Facebook/Apple) devuelve nombre y mail, nada más, y el
// login no puede pedirlo de entrada porque no sabe si sos alguien nuevo.
//
// Sin esto, quien quería registrar su veterinaria o refugio y entró por
// "Continuar con Google" quedaba como particular sin forma de convertirse.
import { useState } from 'react';
import { Text, Pressable, View, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import api from '../src/lib/api';
import { updateUser } from '../src/store/userSlice';
import AuthScreen, { useAuthColors } from '../src/components/AuthScreen';

// Mismas opciones y textos que el registro por email, para que la app se
// sienta coherente sin importar por dónde entraste.
const ACCOUNT_TYPES = [
  {
    id: 'user',
    emoji: '🐾',
    title: 'Busco / reporto mascotas',
    desc: 'Uso Mimo para encontrar o reportar mascotas.',
  },
  {
    id: 'vet',
    emoji: '🏥',
    title: 'Represento una veterinaria',
    desc: 'Publico mascotas encontradas y recibo alertas.',
  },
  {
    id: 'shelter',
    emoji: '🏡',
    title: 'Represento un refugio',
    desc: 'Publico mascotas en adopción y las promociono.',
  },
];

export default function AccountType() {
  const c = useAuthColors();
  const dispatch = useDispatch();
  const [accountType, setAccountType] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    setError('');
    // Particular no crea nada: es el estado por defecto de la cuenta.
    if (accountType === 'user') {
      router.replace('/home');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/account-type', { account_type: accountType });
      dispatch(updateUser({
        has_vet: !!data.has_vet,
        has_shelter: !!data.has_shelter,
        vet_approved: false,
        shelter_approved: false,
      }));
      // Al perfil: ahí se completan los datos de la entidad mientras espera
      // la aprobación del admin.
      router.replace('/profile');
    } catch (e) {
      setError(e?.response?.data?.error || 'No se pudo guardar. Probá de nuevo.');
      setLoading(false);
    }
  };

  const isEntity = accountType === 'vet' || accountType === 'shelter';

  return (
    <AuthScreen
      title="¿Cómo vas a usar Mimo?"
      subtitle="Elegí el tipo de cuenta. Podés cambiarlo después escribiéndonos."
    >
      <View style={{ gap: 8, marginTop: 4 }}>
        {ACCOUNT_TYPES.map((t) => {
          const active = accountType === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setAccountType(t.id)}
              disabled={loading}
              style={[
                styles.typeCard,
                {
                  backgroundColor: active ? c.inputBg : 'transparent',
                  borderColor: active ? c.title : c.label,
                  borderWidth: active ? 2 : 1,
                },
              ]}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeTitle, { color: c.inputText }]}>{t.title}</Text>
                <Text style={[styles.typeDesc, { color: c.subtitle }]}>{t.desc}</Text>
              </View>
              <View
                style={[
                  styles.typeRadio,
                  { borderColor: active ? c.title : c.label, backgroundColor: active ? c.title : 'transparent' },
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {isEntity && (
        <Text style={[styles.note, { color: c.subtitle }]}>
          Vas a poder completar los datos desde tu perfil. Un administrador
          revisa la cuenta antes de que aparezca en el directorio.
        </Text>
      )}

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        onPress={handleContinue}
        disabled={loading}
        style={[styles.button, { backgroundColor: c.primary, opacity: loading ? 0.6 : 1 }]}
      >
        {loading
          ? <ActivityIndicator color={c.primaryText} />
          : <Text style={[styles.buttonText, { color: c.primaryText }]}>Continuar</Text>}
      </Pressable>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
  },
  typeEmoji: { fontSize: 22 },
  typeTitle: { fontSize: 14, fontWeight: '600' },
  typeDesc: { fontSize: 12, marginTop: 2 },
  typeRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  note: { fontSize: 12, lineHeight: 17, marginTop: 14 },
  error: { color: '#DC2626', fontSize: 13, marginTop: 14 },
  button: {
    marginTop: 20,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
});
