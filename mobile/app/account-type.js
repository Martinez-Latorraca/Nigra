// Pregunta el tipo de cuenta UNA sola vez, justo después del primer login
// social. Es el único camino de alta donde no se puede preguntar antes: el
// proveedor (Google/Facebook/Apple) devuelve nombre y mail, nada más, y el
// login no puede pedirlo de entrada porque no sabe si sos alguien nuevo.
//
// Sin esto, quien quería registrar su veterinaria o refugio y entró por
// "Continuar con Google" quedaba como particular sin forma de convertirse.
import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useDispatch } from 'react-redux';
import api from '../src/lib/api';
import { updateUser } from '../src/store/userSlice';
import AuthScreen, { useAuthColors } from '../src/components/AuthScreen';
import AccountTypePicker from '../src/components/AccountTypePicker';
import Button from '../src/components/Button';
import { fonts } from '../src/lib/theme';

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
      footer={<Button title="Continuar" onPress={handleContinue} loading={loading} />}
    >
      <AccountTypePicker value={accountType} onChange={setAccountType} disabled={loading} />

      {isEntity ? (
        <Text style={[styles.note, { color: c.text }]}>
          Vas a poder completar los datos desde tu perfil. Un administrador
          revisa la cuenta antes de que aparezca en el directorio.
        </Text>
      ) : null}

      {error ? <Text style={[styles.error, { color: c.coral }]}>{error}</Text> : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  note: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  error: { fontFamily: fonts.bold, fontSize: 13, textAlign: 'center' },
});
