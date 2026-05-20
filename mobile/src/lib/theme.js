import { useColorScheme } from 'react-native';

export function useTheme() {
  const isDark = useColorScheme() === 'dark';
  return {
    isDark,
    bg: isDark ? '#0A0A0A' : '#F5F5F7',
    card: isDark ? '#1C1C1E' : '#FFFFFF',
    cardBorder: isDark ? '#2C2C2E' : '#F0F0F0',
    title: isDark ? '#FFFFFF' : '#000000',
    text: isDark ? '#FFFFFF' : '#111827',
    subtitle: '#9CA3AF',
    label: '#9CA3AF',
    inputBg: isDark ? '#2C2C2E' : '#F9FAFB',
    inputText: isDark ? '#FFFFFF' : '#111827',
    primary: isDark ? '#FFFFFF' : '#000000',
    primaryText: isDark ? '#000000' : '#FFFFFF',
    divider: isDark ? '#3A3A3C' : '#E5E7EB',
    socialBg: isDark ? '#2C2C2E' : '#FFFFFF',
    socialBorder: isDark ? '#3A3A3C' : '#E5E7EB',
    socialText: isDark ? '#FFFFFF' : '#111827',
  };
}
