import { useEffect, useState } from 'react';
import {
  ScrollView, View, Text, Image, Pressable, StyleSheet, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { goBack } from '../../src/lib/navigation';
import api from '../../src/lib/api';
import { useTheme, palette, fonts, onColor } from '../../src/lib/theme';
import { SkeletonDetail } from '../../src/components/Skeleton';
import { API_URL, SITE_URL } from '../../src/lib/config';
import { adoptionShareMessage } from '../../src/lib/shareText';
import {
  ChevronLeft, ChevronRight, MapPin, MessageCircle, Mail, Share2, Syringe, Scissors,
  PawPrint, Check, Heart,
} from '../../src/lib/icons';
import StatusChip from '../../src/components/StatusChip';
import { useShareSheet } from '../../src/components/ShareSheet';
import Button from '../../src/components/Button';

const SPECIES_LABEL = { dog: 'Perro', cat: 'Gato', other: 'Otro' };
const SIZE_LABEL = { small: 'Chico', medium: 'Mediano', large: 'Grande' };
const AGE_LABEL = { puppy: 'Cachorro', young: 'Joven', adult: 'Adulto', senior: 'Senior', unknown: 'Sin dato' };
const SEX_LABEL = { male: 'Macho', female: 'Hembra', unknown: 'Sin dato' };

function Trait({ children, icon: Icon, c }) {
  return (
    <View style={[styles.trait, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
      {Icon ? <Icon size={14} color={c.text} strokeWidth={2} /> : null}
      <Text style={[styles.traitText, { color: c.text }]}>{children}</Text>
    </View>
  );
}

export default function AdoptionDetail() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activePhoto, setActivePhoto] = useState(0);
  const share = useShareSheet({ message: pet ? adoptionShareMessage(pet, SITE_URL) : '', kind: 'adoption', id });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/api/adoption-pets/${id}`)
      .then(({ data }) => setPet(data))
      .catch(() => setError('No pudimos encontrar esta publicación.'))
      .finally(() => setLoading(false));
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
      <View style={[styles.container, styles.centered, { backgroundColor: c.bg }]}>
        <Text style={[styles.notFoundTitle, { color: c.title }]}>404</Text>
        <Text style={[styles.notFoundText, { color: c.text }]}>{error}</Text>
        <Button
          title="Volver a adopciones"
          color={palette.violeta}
          onPress={() => router.replace('/adoptions')}
          style={styles.notFoundBtn}
        />
      </View>
    );
  }

  const photos = Array.isArray(pet.photos) ? pet.photos : [];
  const adopted = !!pet.adopted_at;
  const openLink = (url) => () => {
    if (url) Linking.openURL(url).catch(() => {});
  };
  const whatsappHref = pet.shelter_whatsapp
    ? `https://wa.me/${String(pet.shelter_whatsapp).replace(/[^\d]/g, '')}?text=Hola,%20me%20interesa%20adoptar%20a%20${encodeURIComponent(pet.name || 'esta mascota')}`
    : null;
  const emailHref = pet.shelter_email
    ? `mailto:${pet.shelter_email}?subject=Consulta%20por%20adopci%C3%B3n%20-%20${encodeURIComponent(pet.name || 'mascota')}`
    : null;
  const shelterColor = palette.teal;
  const name = pet.name || 'Sin nombre';

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {/* Foto principal */}
        <View style={[styles.hero, { backgroundColor: c.photo }]}>
          {photos[activePhoto] ? (
            <Image source={{ uri: photos[activePhoto] }} style={StyleSheet.absoluteFill} />
          ) : (
            <PawPrint size={64} color={c.text} strokeWidth={2} />
          )}
          {adopted ? (
            <View style={styles.adoptedOverlay}>
              <View style={styles.adoptedPill}>
                <Check size={20} color={palette.noche} strokeWidth={3} />
                <Text style={styles.adoptedText}>Ya fue adoptado</Text>
              </View>
            </View>
          ) : null}
          <View style={[styles.heroBar, { top: insets.top + 16 }]}>
            <Pressable
              onPress={() => goBack()}
              accessibilityRole="button"
              style={({ pressed }) => [styles.backPill, { opacity: pressed ? 0.8 : 1 }]}
            >
              <ChevronLeft size={22} color={palette.arena} strokeWidth={2} />
              <Text style={styles.backPillText}>Adopciones</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.sheet, { backgroundColor: c.bg }]}>
          {photos.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
              {photos.map((url, index) => (
                <Pressable
                  key={`${url}-${index}`}
                  onPress={() => setActivePhoto(index)}
                  accessibilityLabel={`Foto ${index + 1}`}
                  style={[styles.thumb, { backgroundColor: c.photo }, index === activePhoto && styles.thumbActive]}
                >
                  <Image source={{ uri: url }} style={StyleSheet.absoluteFill} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.titleBlock}>
            <StatusChip status={adopted ? 'adopted' : 'adoption'} style={styles.statusChip} />
            <Text style={[styles.name, { color: c.title }]}>{name}</Text>
            <View style={styles.traits}>
              <Trait c={c}>{SPECIES_LABEL[pet.species]}</Trait>
              {pet.size ? <Trait c={c}>{SIZE_LABEL[pet.size]}</Trait> : null}
              {pet.age_group && pet.age_group !== 'unknown' ? <Trait c={c}>{AGE_LABEL[pet.age_group]}</Trait> : null}
              {pet.sex && pet.sex !== 'unknown' ? <Trait c={c}>{SEX_LABEL[pet.sex]}</Trait> : null}
              {pet.color ? <Trait c={c}>{pet.color}</Trait> : null}
              {pet.vaccinated ? <Trait c={c} icon={Syringe}>Vacunado</Trait> : null}
              {pet.neutered ? <Trait c={c} icon={Scissors}>Castrado</Trait> : null}
            </View>
          </View>

          {pet.description ? (
            <View style={[styles.card, { backgroundColor: c.card }]}>
              <Text style={[styles.label, { color: c.text }]}>Sobre {name}</Text>
              <Text style={[styles.body, { color: c.text }]}>{pet.description}</Text>
            </View>
          ) : null}

          {/* Final feliz (Adopcion-adoptado.dc.html) */}
          {adopted ? (
            <View style={[styles.card, styles.happyCard]}>
              <View style={styles.happyLabelRow}>
                <Heart size={15} color={palette.arena} strokeWidth={2} />
                <Text style={[styles.label, { color: palette.arena }]}>Final feliz</Text>
              </View>
              <Text style={styles.happyTitle}>{name} ya encontró familia.</Text>
              <Text style={styles.happyText}>
                Compartilo para que más gente conozca al refugio. Hay otras mascotas esperando.
              </Text>
              <Pressable
                onPress={() => router.push('/adoptions')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.happyBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.happyBtnText}>Ver otras en adopción</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Refugio */}
          <View style={[styles.card, styles.shelterCard, { backgroundColor: c.card }]}>
            <Text style={[styles.label, { color: c.text }]}>Refugio</Text>
            <Pressable
              onPress={() => router.push(`/shelters/${pet.shelter_slug}`)}
              style={styles.shelterRow}
            >
              {pet.shelter_logo ? (
                <Image source={{ uri: pet.shelter_logo }} style={[styles.shelterLogo, { backgroundColor: c.photo }]} />
              ) : (
                <View style={[styles.shelterLogo, styles.shelterLogoFallback, { backgroundColor: shelterColor }]}>
                  <Text style={[styles.shelterLogoLetter, { color: onColor(shelterColor) }]}>
                    {pet.shelter_name?.charAt(0) || '?'}
                  </Text>
                </View>
              )}
              <View style={styles.flex}>
                <Text style={[styles.shelterName, { color: c.title }]} numberOfLines={1}>{pet.shelter_name}</Text>
                {pet.shelter_city ? (
                  <View style={styles.cityRow}>
                    <MapPin size={14} color={c.text} strokeWidth={2} />
                    <Text style={[styles.shelterCity, { color: c.text }]}>{pet.shelter_city}</Text>
                  </View>
                ) : null}
              </View>
              <ChevronRight size={20} color={c.text} strokeWidth={2} />
            </Pressable>

            <View style={styles.ctas}>
              {/* Sin "Llamar": el contacto con el refugio va por WhatsApp o
                  mail, que dejan la conversación escrita. */}
              {!adopted && whatsappHref ? (
                <Button variant="dark" icon={MessageCircle} title="Contactar por WhatsApp" onPress={openLink(whatsappHref)} />
              ) : null}
              <View style={styles.ctaRow}>
                {!adopted && emailHref ? (
                  <Button variant="outline" icon={Mail} title="Email" onPress={openLink(emailHref)} style={styles.halfBtn} />
                ) : null}
                {/* Difundir una adopción es la forma más directa de que aparezca
                    alguien, así que el botón va siempre — incluso si ya fue
                    adoptada, para poder compartir el final feliz. */}
                <Button variant="outline" icon={Share2} title="Compartir" onPress={share.open} style={styles.halfBtn} />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      {share.sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
  flex: { flex: 1, minWidth: 0 },

  hero: { height: 380, alignItems: 'center', justifyContent: 'center' },
  heroBar: {
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
    backgroundColor: palette.violeta,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backPillText: { fontFamily: fonts.bold, fontSize: 14, color: palette.arena },
  happyCard: { backgroundColor: palette.violeta, gap: 10 },
  happyLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  happyTitle: { fontFamily: fonts.display, fontSize: 20, lineHeight: 25, color: palette.arena },
  happyText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: palette.arena },
  happyBtn: { height: 48, borderRadius: 14, backgroundColor: palette.crema, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  happyBtnText: { fontFamily: fonts.bold, fontSize: 15, color: palette.noche },
  adoptedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,46,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adoptedPill: {
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: palette.crema,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adoptedText: {
    fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.7, textTransform: 'uppercase', color: palette.noche,
  },

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
  thumbActive: { borderWidth: 3, borderColor: palette.violeta },

  titleBlock: { gap: 10 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 4 },
  name: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38 },
  traits: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trait: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  traitText: { fontFamily: fonts.medium, fontSize: 13 },

  card: { borderRadius: 24, padding: 18, gap: 8 },
  shelterCard: { gap: 16 },
  label: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  shelterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  shelterLogo: { width: 52, height: 52, borderRadius: 16 },
  shelterLogoFallback: { alignItems: 'center', justifyContent: 'center' },
  shelterLogoLetter: { fontFamily: fonts.display, fontSize: 22 },
  shelterName: { fontFamily: fonts.display, fontSize: 17 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  shelterCity: { fontFamily: fonts.regular, fontSize: 13 },
  ctas: { gap: 10 },
  ctaRow: { flexDirection: 'row', gap: 10 },
  halfBtn: { flex: 1, height: 52, paddingHorizontal: 12 },

  notFoundTitle: { fontFamily: fonts.display, fontSize: 60 },
  notFoundText: { fontFamily: fonts.regular, fontSize: 15, textAlign: 'center' },
  notFoundBtn: { alignSelf: 'stretch', marginTop: 8 },
});
