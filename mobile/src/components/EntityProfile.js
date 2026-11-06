import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTheme, palette, fonts, onColor } from '../lib/theme';
import { useSidebar } from '../lib/sidebar';
import {
  ChevronLeft, ChevronRight, Menu, MapPin, Clock, Phone, MessageCircle, Mail, Globe, AtSign,
} from '../lib/icons';
import IconButton from './IconButton';

// Piezas compartidas de las fichas de refugio y de veterinaria
// (pantallas/Refugio-ficha y Vet-ficha): portada con volver/menú, tarjeta de
// identidad, tarjetas de texto, horarios y contactos. `color` = color de la
// sección (Teal refugios, Noche vets).

export function CoverHeader({ coverUrl, color, backLabel }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { open } = useSidebar();
  const fg = onColor(color);
  return (
    <View style={[styles.cover, { backgroundColor: c.arena }]}>
      {coverUrl ? <Image source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} /> : null}
      <View style={[styles.coverBar, { top: insets.top + 16 }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.backPill, { backgroundColor: color, opacity: pressed ? 0.8 : 1 }]}
        >
          <ChevronLeft size={22} color={fg} strokeWidth={2} />
          <Text style={[styles.backPillText, { color: fg }]}>{backLabel}</Text>
        </Pressable>
        <IconButton icon={Menu} iconSize={22} color={palette.arena} backgroundColor={color} accessibilityLabel="Menú" onPress={open} />
      </View>
    </View>
  );
}

export function IdentityCard({ logoUrl, name, kicker, location, color, badge }) {
  const c = useTheme();
  return (
    <View style={[styles.identity, { backgroundColor: c.card }]}>
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={[styles.logo, { backgroundColor: c.arena }]} />
      ) : (
        <View style={[styles.logo, styles.logoFallback, { backgroundColor: color }]}>
          <Text style={[styles.logoLetter, { color: palette.arena }]}>{name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.identityTexts}>
        <Text style={[styles.label, { color: c.text }]}>{kicker}</Text>
        {badge}
        <Text style={[styles.identityName, { color: c.title }]}>{name}</Text>
        {location ? (
          <View style={styles.row}>
            <MapPin size={15} color={c.text} strokeWidth={2} />
            <Text style={[styles.locationText, { color: c.text }]}>{location}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function InfoCard({ title, icon: Icon, children, style }) {
  const c = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: c.card }, style]}>
      <View style={styles.row}>
        {Icon ? <Icon size={15} color={c.text} strokeWidth={2} /> : null}
        <Text style={[styles.label, { color: c.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const HOURS_ORDER = [
  ['mon', 'Lunes'], ['tue', 'Martes'], ['wed', 'Miércoles'],
  ['thu', 'Jueves'], ['fri', 'Viernes'], ['sat', 'Sábado'], ['sun', 'Domingo'],
];

export function HoursCard({ hours }) {
  const c = useTheme();
  if (!hours || Object.keys(hours).length === 0) return null;
  return (
    <InfoCard title="Horarios" icon={Clock} style={styles.hoursCard}>
      {HOURS_ORDER.map(([k, label]) => {
        const v = hours[k];
        if (!v) return null;
        return (
          <View key={k} style={[styles.hourRow, { borderTopColor: c.cardBorder }]}>
            <Text style={[styles.hourDay, { color: c.text }]}>{label}</Text>
            <Text style={[styles.hourValue, { color: c.text }]}>{v}</Text>
          </View>
        );
      })}
    </InfoCard>
  );
}

// Contactos: solo se muestran los que tienen valor. onOpen(url) abre el link
// (cada pantalla decide si además lo trackea).
export function ContactList({ entity, color, onOpen }) {
  const c = useTheme();
  const ig = entity.instagram ? String(entity.instagram).replace(/^@/, '') : null;
  const rows = [
    { key: 'phone', icon: Phone, label: 'Teléfono', value: entity.phone, href: entity.phone ? `tel:${entity.phone}` : null },
    {
      key: 'whatsapp', icon: MessageCircle, label: 'WhatsApp', value: entity.whatsapp,
      href: entity.whatsapp ? `https://wa.me/${String(entity.whatsapp).replace(/[^\d]/g, '')}` : null,
    },
    { key: 'email', icon: Mail, label: 'Email', value: entity.email, href: entity.email ? `mailto:${entity.email}` : null },
    { key: 'website', icon: Globe, label: 'Sitio web', value: entity.website, href: entity.website || null },
    { key: 'instagram', icon: AtSign, label: 'Instagram', value: ig ? `@${ig}` : null, href: ig ? `https://instagram.com/${ig}` : null },
  ].filter((r) => r.value);
  if (rows.length === 0) return null;
  return (
    <View style={[styles.contacts, { backgroundColor: c.card }]}>
      {rows.map((r, i) => {
        const Icon = r.icon;
        return (
          <Pressable
            key={r.key}
            onPress={r.href ? () => onOpen(r.href) : undefined}
            disabled={!r.href}
            style={({ pressed }) => [
              styles.contactRow,
              i > 0 && { borderTopWidth: 1, borderTopColor: c.cardBorder },
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={[styles.contactIcon, { backgroundColor: color }]}>
              <Icon size={20} color={palette.arena} strokeWidth={2} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.contactLabel, { color: c.text }]}>{r.label}</Text>
              <Text style={[styles.contactValue, { color: c.text }]} numberOfLines={1}>{r.value}</Text>
            </View>
            <ChevronRight size={18} color={c.text} strokeWidth={2} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  cover: { height: 220 },
  coverBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backPill: {
    height: 44,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backPillText: { fontFamily: fonts.bold, fontSize: 14 },

  identity: {
    borderRadius: 28,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: palette.noche,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  logo: { width: 72, height: 72, borderRadius: 22 },
  logoFallback: { alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontFamily: fonts.display, fontSize: 32 },
  identityTexts: { flex: 1, minWidth: 0, gap: 3 },
  identityName: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30 },
  locationText: { flex: 1, fontFamily: fonts.regular, fontSize: 14 },

  card: { borderRadius: 24, padding: 18, gap: 8 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },

  hoursCard: { gap: 4 },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  hourDay: { fontFamily: fonts.bold, fontSize: 14 },
  hourValue: { fontFamily: fonts.regular, fontSize: 14 },

  contacts: { borderRadius: 24, paddingHorizontal: 18, paddingVertical: 6 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  contactIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase' },
  contactValue: { fontFamily: fonts.medium, fontSize: 15 },
});
