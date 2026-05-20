import { Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { clearCredentials } from '../src/store/userSlice';
import { useTheme } from '../src/lib/theme';

export default function Home() {
  const { data, token } = useSelector((s) => s.user);
  const dispatch = useDispatch();
  const c = useTheme();

  if (!token) return <Redirect href="/login" />;

  const handleLogout = () => {
    dispatch(clearCredentials());
    router.replace('/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.title, { color: c.title }]}>¡Hola, {data?.name || 'usuario'}!</Text>
      <Text style={[styles.subtitle, { color: c.subtitle }]}>
        Tu home de Nigra mobile va a vivir acá.
      </Text>
      <Pressable style={[styles.button, { backgroundColor: c.primary }]} onPress={handleLogout}>
        <Text style={[styles.buttonText, { color: c.primaryText }]}>Cerrar sesión</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { textAlign: 'center' },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 24,
  },
  buttonText: { fontWeight: '600' },
});
