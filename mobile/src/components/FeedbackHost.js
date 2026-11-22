import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setFeedbackListener } from '../lib/feedback';
import { palette, fonts, onColor, useTheme } from '../lib/theme';
import { Check, ChevronRight, CircleAlert, CircleCheck } from '../lib/icons';
import Button from './Button';

const TONES = { good: palette.violeta, neutral: palette.noche, danger: palette.coral };
const TOAST_MS = 3200;

// Muestra las hojas de confirmación y los avisos breves de src/lib/feedback.js.
export default function FeedbackHost() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState(null); // { kind, opts, resolve }
  const [toastState, setToastState] = useState(null);
  const slide = useRef(new Animated.Value(0)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(
    () =>
      setFeedbackListener((req) => {
        if (req.kind === 'toast') {
          setToastState({ ...req.opts, key: Date.now() });
          return;
        }
        setSheet((prev) => {
          // Si había otra abierta, se resuelve como cancelada.
          prev?.resolve(prev.kind === 'confirm' ? false : null);
          return req;
        });
      }),
    []
  );

  useEffect(() => {
    if (!sheet) return;
    slide.setValue(0);
    Animated.spring(slide, { toValue: 1, useNativeDriver: true, bounciness: 0, speed: 16 }).start();
  }, [sheet, slide]);

  useEffect(() => {
    if (!toastState) return;
    toastAnim.setValue(0);
    Animated.timing(toastAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
        setToastState(null)
      );
    }, TOAST_MS);
    return () => clearTimeout(t);
  }, [toastState, toastAnim]);

  const close = (value) => {
    if (!sheet) return;
    const { resolve } = sheet;
    Animated.timing(slide, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setSheet(null);
      resolve(value);
    });
  };

  const cancelValue = sheet?.kind === 'confirm' ? false : null;
  const o = sheet?.opts || {};
  const toneColor = TONES[o.tone] || palette.noche;
  const Icon = o.icon;

  return (
    <>
      <Modal visible={!!sheet} transparent animationType="fade" statusBarTranslucent onRequestClose={() => close(cancelValue)}>
        <Pressable style={styles.backdrop} onPress={() => close(cancelValue)}>
          <Animated.View
            style={[
              styles.sheet,
              { backgroundColor: c.bg, paddingBottom: insets.bottom + 24 },
              { transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [400, 0] }) }] },
            ]}
          >
            {/* Pressable vacío: que tocar la hoja no la cierre. */}
            <Pressable style={styles.sheetInner} onPress={() => {}} accessible={false}>
              <View style={[styles.grabber, { backgroundColor: c.isDark ? 'rgba(255,246,240,0.2)' : 'rgba(26,26,46,0.15)' }]} />
              {sheet?.kind === 'confirm' && Icon ? (
                <View style={[styles.iconTile, { backgroundColor: toneColor }]}>
                  <Icon size={28} color={onColor(toneColor)} strokeWidth={2} />
                </View>
              ) : null}
              <View style={styles.texts}>
                <Text style={[styles.title, { color: c.title }]}>{o.title}</Text>
                {o.text ? <Text style={[styles.text, { color: c.text }]}>{o.text}</Text> : null}
              </View>
              {o.note ? <Text style={[styles.note, { backgroundColor: c.card, color: c.text }]}>{o.note}</Text> : null}

              {sheet?.kind === 'choose'
                ? (o.options || []).map((opt) => {
                    const OptIcon = opt.icon;
                    const optColor = opt.color || palette.coral;
                    return (
                      <Pressable
                        key={String(opt.value)}
                        onPress={() => close(opt.value)}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.option, { backgroundColor: c.card, opacity: pressed ? 0.85 : 1 }]}
                      >
                        {OptIcon ? (
                          <View style={[styles.optionTile, { backgroundColor: optColor }]}>
                            <OptIcon size={22} color={onColor(optColor)} strokeWidth={2} />
                          </View>
                        ) : null}
                        <View style={styles.optionTexts}>
                          <Text style={[styles.optionTitle, { color: c.title }]}>{opt.title}</Text>
                          {opt.text ? <Text style={[styles.optionText, { color: c.text }]}>{opt.text}</Text> : null}
                        </View>
                        {opt.selected ? (
                          <Check size={22} color={palette.teal} strokeWidth={2.4} />
                        ) : (
                          <ChevronRight size={20} color={c.text} strokeWidth={2} />
                        )}
                      </Pressable>
                    );
                  })
                : null}

              <View style={styles.buttons}>
                {sheet?.kind === 'confirm' ? (
                  <Button
                    title={o.confirmText || 'Confirmar'}
                    color={toneColor}
                    variant={o.tone === 'neutral' ? 'dark' : 'primary'}
                    onPress={() => close(true)}
                    style={styles.primaryBtn}
                    textStyle={styles.btnText}
                  />
                ) : null}
                <Button
                  title="Cancelar"
                  variant="outline"
                  color={c.title}
                  onPress={() => close(cancelValue)}
                  style={styles.cancelBtn}
                  textStyle={styles.btnText}
                />
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>

      {toastState ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            { bottom: insets.bottom + 100, opacity: toastAnim },
            { transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] },
          ]}
        >
          {toastState.type === 'error' ? (
            <CircleAlert size={20} color={palette.coral} strokeWidth={2} />
          ) : (
            <CircleCheck size={20} color={palette.teal} strokeWidth={2} />
          )}
          <Text style={styles.toastText}>{toastState.text}</Text>
        </Animated.View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26,26,46,0.55)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  sheetInner: { gap: 14 },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 999 },
  iconTile: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  texts: { gap: 6 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26 },
  text: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  note: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18 },
  optionTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionTexts: { flex: 1, gap: 2 },
  optionTitle: { fontFamily: fonts.bold, fontSize: 15 },
  optionText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  buttons: { gap: 8, marginTop: 4 },
  primaryBtn: { height: 52, borderRadius: 16 },
  cancelBtn: { height: 48, borderRadius: 16 },
  btnText: { fontSize: 15 },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: palette.noche,
    elevation: 8,
  },
  toastText: { flex: 1, fontFamily: fonts.bold, fontSize: 14, lineHeight: 19, color: palette.crema },
});
