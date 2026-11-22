import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import api from '../../src/lib/api';
import { useTheme, palette, fonts } from '../../src/lib/theme';
import { SkeletonDetail } from '../../src/components/Skeleton';
import {
  ChevronLeft, User, Calendar, Stethoscope, Star, MapPin, HeartHandshake,
  MessageCircle, Share2, Trash2, Shield, RotateCcw,
} from '../../src/lib/icons';
import { confirm, toast } from '../../src/lib/feedback';
import { translateType, translateColor } from '../../src/lib/translations';
import { API_URL } from '../../src/lib/config';
import PetMap from '../../src/components/PetMap';
import IconButton from '../../src/components/IconButton';
import StatusChip from '../../src/components/StatusChip';
import Button from '../../src/components/Button';

function parseExtraPhotos(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Color de los botones sobre la foto según desde dónde se abrió la ficha.
const ORIGIN_COLORS = { explorar: palette.sol, coincidencias: palette.coral };

export default function PetDetail() {
  const { id, origen } = useLocalSearchParams();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const me = useSelector((s) => s.user.data);
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Foto que se ve grande (0 = principal, después las extra).
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .get(`/api/pets/${id}`)
      .then(({ data }) => active && setPet(data))
      .catch(() => active && setError('No pudimos encontrar esta mascota.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <SkeletonDetail />
      </View>
    );
  }

  if (error || !pet) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: c.bg, padding: 20 }]}>
        <Text style={[styles.notFound, { color: c.title }]}>404</Text>
        <Text style={[styles.notFoundMsg, { color: c.text }]}>{error}</Text>
        <Button title="Volver" onPress={() => router.back()} style={styles.notFoundBtn} />
      </View>
    );
  }

  const isLost = pet.status === 'lost';
  const isOwn = me?.id != null && Number(me.id) === Number(pet.user_id);
  const isResolved = !!pet.resolved_at;
  const photos = [pet.photo_url, ...parseExtraPhotos(pet.extra_photos)].filter(Boolean);
  const mainPhoto = photos[photoIdx] || pet.photo_url;
  const btnBg = ORIGIN_COLORS[origen] || palette.sol;
  const meta = [translateType(pet.type), translateColor(pet.color)].filter(Boolean).join(' · ');

  const handleShare = () => {
    Share.share({
      message:
        isLost
          ? `🔍 ¡Ayudanos a encontrar a ${pet.name || 'una mascota'}! ${API_URL}/pet/${pet.id}`
          : `🐾 ¿Reconocés a esta mascota? ${API_URL}/pet/${pet.id}`,
    });
  };
  const handleMap = () => {
    if (pet.lat && pet.lng) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${pet.lat},${pet.lng}`);
    }
  };
  const handleChat = () => {
    router.push({
      pathname: `/chat/${pet.id}`,
      params: {
        otherUserId: String(pet.user_id),
        name: pet.reporter_name || 'Informante',
        photo: pet.photo_url || '',
      },
    });
  };
  // El caso se cierra solo desde el chat (commit 0a765fc). Desde la ficha el
  // dueño solo puede reabrir un caso ya cerrado.
  const handleResolve = async (resolved) => {
    const ok = await confirm(
      resolved
        ? {
            tone: 'good',
            icon: HeartHandshake,
            title: `¿${pet.name || 'Tu mascota'} volvió a casa?`,
            text: 'Se ocultará de las búsquedas y del feed. Si te equivocás, lo podés reabrir.',
            confirmText: 'Sí, marcar reunida',
          }
        : {
            tone: 'neutral',
            icon: RotateCcw,
            title: '¿Reabrir el reporte?',
            text: 'Vuelve a aparecer en las búsquedas y en el feed.',
            confirmText: 'Reabrir',
          }
    );
    if (!ok) return;
    try {
      const { data } = await api.patch(`/api/pets/${pet.id}/resolve`, { resolved });
      setPet((prev) => ({ ...prev, resolved_at: data.resolved_at }));
    } catch {
      toast('No se pudo actualizar el estado. Probá de nuevo.', 'error');
    }
  };
  const handleDelete = async () => {
    const ok = await confirm({
      tone: 'danger',
      icon: Trash2,
      title: '¿Eliminar esta publicación?',
      text: 'Se borra de forma permanente, con sus fotos.',
      note: 'No se puede deshacer.',
      confirmText: 'Eliminar',
    });
    if (!ok) return;
    try {
      await api.delete(`/api/pets/${pet.id}`);
      router.back();
    } catch {
      toast('No se pudo eliminar la publicación. Probá de nuevo.', 'error');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {/* Foto principal con volver e ID encima */}
        <View style={[styles.hero, { backgroundColor: c.arena }]}>
          <Image source={{ uri: mainPhoto }} style={StyleSheet.absoluteFill} />
          <View style={[styles.heroBar, { top: insets.top + 16 }]}>
            <IconButton
              icon={ChevronLeft}
              color={palette.crema}
              backgroundColor={btnBg}
              accessibilityLabel="Volver"
              onPress={() => router.back()}
            />
            <View style={styles.idPill}>
              <Text style={styles.idText}>Mimo ID #{pet.id}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sheet, { backgroundColor: c.bg }]}>
          {photos.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
              {photos.map((url, i) => (
                <Pressable
                  key={`${url}-${i}`}
                  onPress={() => setPhotoIdx(i)}
                  accessibilityLabel={`Foto ${i + 1}`}
                  style={[styles.thumb, { backgroundColor: c.arena }, i === photoIdx && styles.thumbActive]}
                >
                  <Image source={{ uri: url }} style={StyleSheet.absoluteFill} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.titleBlock}>
            <View style={styles.chipRow}>
              <StatusChip
                status={isResolved ? 'reunited' : pet.status}
                label={isResolved ? 'Reencontrada ✓' : undefined}
                style={styles.statusChip}
              />
              {meta ? <Text style={[styles.meta, { color: c.text }]}>{meta}</Text> : null}
            </View>
            <Text style={[styles.name, { color: c.title }]}>
              {isLost ? pet.name || 'Sin nombre' : 'Encontrado'}
            </Text>
            <View style={styles.facts}>
              <View style={styles.fact}>
                <User size={16} color={c.text} strokeWidth={2} />
                <Text style={[styles.factText, { color: c.text }]}>
                  Informante: <Text style={styles.strong}>{pet.reporter_name || 'Anónimo'}</Text>
                </Text>
              </View>
              {pet.created_at ? (
                <View style={styles.fact}>
                  <Calendar size={16} color={c.text} strokeWidth={2} />
                  <Text style={[styles.factText, { color: c.text }]}>
                    {new Date(pet.created_at).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {pet.vet_name ? (
            <Pressable
              onPress={() => (pet.vet_slug ? router.push(`/vets/${pet.vet_slug}`) : null)}
              style={[styles.vetChip, { backgroundColor: c.card, borderColor: c.cardBorder }]}
            >
              <Stethoscope size={16} color={c.text} strokeWidth={2} />
              <Text style={[styles.vetChipText, { color: c.text }]}>Reportado por {pet.vet_name}</Text>
              {pet.vet_verified_at ? (
                <Star size={14} color={palette.sol} fill={palette.sol} strokeWidth={2} />
              ) : null}
            </Pressable>
          ) : null}

          <View style={[styles.descCard, { backgroundColor: c.card }]}>
            <Text style={[styles.label, { color: c.text }]}>Descripción</Text>
            <Text style={[styles.description, { color: c.text }]}>
              {pet.description && pet.description !== 'Desconocido'
                ? pet.description
                : 'Sin detalles adicionales.'}
            </Text>
          </View>

          {pet.address || (pet.lat && pet.lng) ? (
            <View style={styles.locationBlock}>
              {pet.address ? (
                <View style={styles.fact}>
                  <MapPin size={16} color={c.text} strokeWidth={2} />
                  <Text style={[styles.factText, styles.flex, { color: c.text }]}>
                    {isLost ? 'Perdido' : 'Encontrado'} cerca de <Text style={styles.strong}>{pet.address}</Text>
                  </Text>
                </View>
              ) : null}
              {pet.lat && pet.lng ? (
                <Pressable
                  onPress={handleMap}
                  accessibilityLabel="Abrir en el mapa"
                  style={[styles.mapWrap, { backgroundColor: c.arena }]}
                >
                  <PetMap lat={pet.lat} lng={pet.lng} isDark={c.isDark} style={styles.map} />
                  <View style={[styles.mapPill, { backgroundColor: c.card }]}>
                    <Text style={[styles.mapPillText, { color: c.text }]}>Abrir en Maps</Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <View style={styles.actions}>
            {isResolved ? (
              <View style={styles.reunited}>
                <HeartHandshake size={28} color={palette.arena} strokeWidth={2} />
                <View style={styles.flex}>
                  <Text style={styles.reunitedTitle}>¡Volvió a casa!</Text>
                  <Text style={styles.reunitedText}>Esta mascota ya se reencontró con su familia.</Text>
                </View>
              </View>
            ) : null}

            {isOwn ? (
              <Text style={[styles.ownLabel, { color: c.text }]}>Esta es tu publicación</Text>
            ) : null}

            {!isOwn && !isResolved ? (
              <Button
                variant="dark"
                icon={MessageCircle}
                title={isLost ? 'Enviar información' : 'Contactar al rescatista'}
                onPress={handleChat}
              />
            ) : null}

            {/* Sin "Llamar": el contacto por una mascota perdida va SOLO por el
                chat interno. Un teléfono expuesto no se puede retirar después, no
                deja rastro moderable y es la vía habitual de las estafas de
                "recompensa". El chat queda registrado y se puede bloquear/denunciar. */}
            <Button variant="outline" icon={Share2} title="Compartir" onPress={handleShare} style={styles.shareBtn} />

            {isOwn && isResolved ? (
              <Pressable onPress={() => handleResolve(false)} style={styles.textBtn}>
                <Text style={[styles.textBtnText, { color: c.text }]}>Reabrir reporte</Text>
              </Pressable>
            ) : null}

            {isOwn ? (
              <Pressable onPress={handleDelete} style={[styles.textBtn, styles.deleteBtn]}>
                <Trash2 size={18} color={c.text} strokeWidth={2} />
                <Text style={[styles.textBtnText, { color: c.text }]}>Eliminar publicación</Text>
              </Pressable>
            ) : null}

            {!isOwn && !isResolved ? (
              <View style={styles.safety}>
                <Shield size={16} color={c.text} strokeWidth={2} style={styles.safetyIcon} />
                <Text style={[styles.safetyText, { color: c.text }]}>
                  Por tu seguridad, el contacto es solo por el chat de Mimo. Nunca compartas datos de pago.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  flex: { flex: 1 },
  strong: { fontFamily: fonts.bold },

  hero: { height: 380 },
  heroBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  idPill: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(26,26,46,0.55)',
    justifyContent: 'center',
  },
  idText: { fontFamily: fonts.bold, fontSize: 12, color: palette.crema },

  sheet: {
    marginTop: -32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 20,
  },
  thumbs: { gap: 8 },
  thumb: { width: 64, height: 64, borderRadius: 16, overflow: 'hidden' },
  thumbActive: { borderWidth: 3, borderColor: palette.coral },

  titleBlock: { gap: 8 },
  chipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 4 },
  meta: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  name: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, marginTop: 4 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 6 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factText: { fontFamily: fonts.regular, fontSize: 14 },

  vetChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  vetChipText: { fontFamily: fonts.bold, fontSize: 13 },

  descCard: { borderRadius: 24, padding: 18, gap: 8 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  description: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },

  locationBlock: { gap: 10 },
  mapWrap: { height: 180, borderRadius: 24, overflow: 'hidden' },
  map: { flex: 1 },
  mapPill: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  mapPillText: { fontFamily: fonts.bold, fontSize: 12 },

  actions: { gap: 10 },
  reunited: {
    backgroundColor: palette.violeta,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reunitedTitle: { fontFamily: fonts.display, fontSize: 17, color: palette.arena },
  reunitedText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: palette.arena },
  ownLabel: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase' },
  shareBtn: { height: 52 },
  textBtn: { height: 48, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { flexDirection: 'row', gap: 8 },
  textBtnText: { fontFamily: fonts.bold, fontSize: 14 },
  safety: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 4 },
  safetyIcon: { marginTop: 2 },
  safetyText: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },

  notFound: { fontFamily: fonts.display, fontSize: 64 },
  notFoundMsg: { fontFamily: fonts.regular, fontSize: 15, textAlign: 'center' },
  notFoundBtn: { alignSelf: 'stretch', marginTop: 8 },
});
