import { Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { clearCredentials } from '../src/store/userSlice';

export default function Home() {
  const { data, token } = useSelector((s) => s.user);
  const dispatch = useDispatch();

  if (!token) return <Redirect href="/login" />;

  const handleLogout = () => {
    dispatch(clearCredentials());
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>¡Hola, {data?.name || 'usuario'}!</Text>
      <Text style={styles.subtitle}>Tu home de Nigra mobile va a vivir acá.</Text>
      <Pressable style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Cerrar sesión</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#F5F5F7',
  },
  title: { fontSize: 28, fontWeight: '700', color: '#000' },
  subtitle: { color: '#6B7280', textAlign: 'center' },
  button: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 24,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
