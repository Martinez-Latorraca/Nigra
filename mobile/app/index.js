import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';

export default function Index() {
  const token = useSelector((s) => s.user.token);
  return <Redirect href={token ? '/home' : '/login'} />;
}
