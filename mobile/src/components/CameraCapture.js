import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import Svg, { Path, Rect, Defs, Mask, G } from 'react-native-svg';
import { SILHOUETTES } from '../lib/cameraSilhouettes';
import { palette, fonts } from '../lib/theme';
import { X, Zap, ZapOff, Flashlight, SwitchCamera, Minus, Plus, CameraOff } from '../lib/icons';
import Button from './Button';

// Lado del cuadrado de la silueta en DP (centrado en pantalla). Se usa para
// dibujar la guía y para recortar la foto exactamente a esa región (hocico y
// orejas quedan dentro). En pantallas angostas se achica para que entre.
const SILHOUETTE_MAX_DP = 400;
const silhouetteSize = (screenW) => Math.min(SILHOUETTE_MAX_DP, Math.round(screenW - 6));

const SPECIES = [
  { value: 'dog', label: 'Perro' },
  { value: 'cat', label: 'Gato' },
];

const FLASH_CYCLE = { off: 'auto', auto: 'on', on: 'off' };
const FLASH_LABEL = { off: 'Off', auto: 'Auto', on: 'On' };

// onPickGallery (opcional): alternativa "Elegir de la galería" en la pantalla de permiso.
// species / onSpeciesChange (opcional): perro o gato, sincronizado con el formulario.
export default function CameraCapture({ visible, onClose, onCapture, onPickGallery, species = 'dog', onSpeciesChange }) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState('off');
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [localSpecies, setLocalSpecies] = useState(species);
  const currentSpecies = onSpeciesChange ? species : localSpecies;
  const setSpecies = onSpeciesChange || setLocalSpecies;
  const [{ width: screenW, height: screenH }, setScreen] = useState(Dimensions.get('window'));

  const stepZoom = (delta) => setZoom((z) => Math.min(1, Math.max(0, Math.round((z + delta) * 100) / 100)));

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      // Recortamos al cuadrado que ocupa la silueta en pantalla. El preview usa
      // "cover" (escala la foto para llenar la pantalla, centrada), así que
      // convertimos los 400 DP del SVG a píxeles de la foto con esa misma escala.
      // Mismo tamaño de pantalla que usa el overlay (medido con onLayout).
      const coverScale = Math.max(screenW / photo.width, screenH / photo.height);
      const size = Math.min(Math.round(silhouetteSize(screenW) / coverScale), photo.width, photo.height);
      const originX = Math.round((photo.width - size) / 2);
      const originY = Math.round((photo.height - size) / 2);
      const rendered = await ImageManipulator.manipulate(photo.uri)
        .crop({ originX, originY, width: size, height: size })
        .renderAsync();
      const cropped = await rendered.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
      onCapture(cropped);
      onClose();
    } catch {
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View
        style={styles.container}
        onLayout={(e) => setScreen({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
      >
        {!permission?.granted ? (
          <View style={styles.permission}>
            {/* Estados.dc.html · Permiso de cámara */}
            <Pressable
              style={[styles.roundBtn, styles.permissionClose, { top: insets.top + 16 }]}
              onPress={onClose}
              hitSlop={8}
              accessibilityLabel="Cerrar"
            >
              <X size={22} color={palette.crema} strokeWidth={2} />
            </Pressable>
            <View style={styles.permissionTile}>
              <CameraOff size={38} color={palette.crema} strokeWidth={2} />
            </View>
            <Text style={styles.permissionTitle}>Necesitamos tu cámara</Text>
            <Text style={styles.permissionText}>
              Para sacarle una foto a la mascota y buscar coincidencias. Solo la usamos mientras estás en esta
              pantalla.
            </Text>
            <View style={styles.permissionActions}>
              <Button title="Dar permiso" onPress={requestPermission} style={styles.permissionBtn} textStyle={styles.permissionBtnText} />
              {onPickGallery ? (
                <Text onPress={onPickGallery} style={styles.permissionLink}>
                  Elegir de la galería
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <>
            <CameraView
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing={facing}
              flash={flash}
              enableTorch={torch}
              zoom={zoom}
            />

            {/* Overlay guía (Camara.dc.html): todo fuera de la silueta se oscurece
                con Noche al 62 % y la silueta (perro o gato) va en Crema encima. */}
            <SilhouetteOverlay width={screenW} height={screenH} species={currentSpecies} />
            <View style={[styles.hint, { top: insets.top + 96 }]} pointerEvents="none">
              <Text style={styles.hintTitle}>Encuadrá la cara</Text>
              <Text style={styles.hintText}>Orejas y hocico dentro de la silueta</Text>
            </View>

            {/* Controles de arriba: cerrar · flash · luz · girar */}
            <View style={[styles.topBar, { top: insets.top + 16 }]}>
              <Pressable style={styles.roundBtn} onPress={onClose} hitSlop={8} accessibilityLabel="Cerrar">
                <X size={22} color={palette.crema} strokeWidth={2} />
              </Pressable>
              <View style={styles.topRight}>
                <Pressable
                  style={[styles.roundBtn, styles.flashBtn, flash !== 'off' && styles.btnActive]}
                  onPress={() => setFlash((f) => FLASH_CYCLE[f])}
                  hitSlop={8}
                  accessibilityLabel={`Flash: ${FLASH_LABEL[flash]}`}
                >
                  {flash === 'off' ? (
                    <ZapOff size={20} color={palette.crema} strokeWidth={2} />
                  ) : (
                    <Zap size={20} color={palette.noche} strokeWidth={2} />
                  )}
                  <Text style={[styles.flashText, { color: flash === 'off' ? palette.crema : palette.noche }]}>
                    {FLASH_LABEL[flash]}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.roundBtn, torch && styles.btnActive]}
                  onPress={() => setTorch((t) => !t)}
                  hitSlop={8}
                  accessibilityLabel="Luz"
                >
                  <Flashlight size={20} color={torch ? palette.noche : palette.crema} strokeWidth={2} />
                </Pressable>
                <Pressable
                  style={styles.roundBtn}
                  onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                  hitSlop={8}
                  accessibilityLabel="Girar cámara"
                >
                  <SwitchCamera size={20} color={palette.crema} strokeWidth={2} />
                </Pressable>
              </View>
            </View>

            {/* Especie + zoom + disparador */}
            <View style={[styles.controls, { bottom: insets.bottom + 40 }]}>
              <View style={styles.controlsRow}>
              <View style={styles.speciesRow} accessibilityRole="radiogroup" accessibilityLabel="Especie">
                {SPECIES.map((sp) => {
                  const active = currentSpecies === sp.value;
                  return (
                    <Pressable
                      key={sp.value}
                      onPress={() => setSpecies(sp.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active }}
                      style={[styles.speciesBtn, active && styles.speciesBtnActive]}
                    >
                      <Text style={[styles.speciesText, { color: active ? palette.noche : palette.crema }]}>{sp.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.zoomRow}>
                <Pressable style={styles.zoomBtn} onPress={() => stepZoom(-0.1)} hitSlop={8} accessibilityLabel="Alejar">
                  <Minus size={20} color={palette.crema} strokeWidth={2} />
                </Pressable>
                <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
                <Pressable style={styles.zoomBtn} onPress={() => stepZoom(0.1)} hitSlop={8} accessibilityLabel="Acercar">
                  <Plus size={20} color={palette.crema} strokeWidth={2} />
                </Pressable>
              </View>
              </View>
              <Pressable style={styles.shutter} onPress={takePhoto} accessibilityLabel="Sacar foto">
                <View style={styles.shutterInner} />
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function SilhouetteOverlay({ width, height, species }) {
  const sil = SILHOUETTES[species] || SILHOUETTES.dog;
  const size = silhouetteSize(width);
  const scale = size / 24; // los íconos usan una grilla de 24
  const x0 = (width - size) / 2;
  const y0 = (height - size) / 2;
  const transform = `translate(${x0} ${y0}) scale(${scale})`;
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Mask id="recorte" x="0" y="0" width={width} height={height} maskUnits="userSpaceOnUse">
          <Rect x="0" y="0" width={width} height={height} fill="#FFFFFF" />
          <G transform={transform}>
            {sil.holes.map((d, i) => <Path key={i} d={d} fill="#000000" />)}
          </G>
        </Mask>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill={palette.noche} fillOpacity={0.62} mask="url(#recorte)" />
      <G transform={transform}>
        {sil.strokes.map((st, i) => (
          <Path
            key={i}
            d={st.d}
            fill="none"
            stroke={palette.crema}
            strokeWidth={st.w / scale}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </G>
    </Svg>
  );
}

const DIM = 'rgba(26,26,46,0.55)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.noche },
  hint: { position: 'absolute', left: 32, right: 32, alignItems: 'center', gap: 6 },
  hintTitle: {
    fontFamily: fonts.display, fontSize: 22, color: palette.crema, textAlign: 'center',
    textShadowColor: 'rgba(26,26,46,0.6)', textShadowRadius: 6,
  },
  hintText: {
    fontFamily: fonts.regular, fontSize: 14, color: palette.crema, textAlign: 'center',
    textShadowColor: 'rgba(26,26,46,0.6)', textShadowRadius: 6,
  },
  topBar: {
    position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  topRight: { flexDirection: 'row', gap: 8 },
  roundBtn: {
    minWidth: 44, height: 44, borderRadius: 22, backgroundColor: DIM, alignItems: 'center', justifyContent: 'center',
  },
  flashBtn: { flexDirection: 'row', gap: 4, paddingLeft: 10, paddingRight: 12 },
  flashText: { fontFamily: fonts.bold, fontSize: 12 },
  btnActive: { backgroundColor: palette.sol },
  controls: { position: 'absolute', left: 0, right: 0, alignItems: 'center', gap: 20 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  speciesRow: { flexDirection: 'row', gap: 2, padding: 4, borderRadius: 999, backgroundColor: DIM },
  speciesBtn: { height: 36, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  speciesBtnActive: { backgroundColor: palette.crema },
  speciesText: { fontFamily: fonts.bold, fontSize: 14 },
  zoomRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: DIM, borderRadius: 999, padding: 4,
  },
  zoomBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  zoomLabel: { fontFamily: fonts.bold, fontSize: 14, color: palette.crema, minWidth: 52, textAlign: 'center' },
  shutter: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: palette.crema,
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: palette.coral },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  permissionClose: { position: 'absolute', left: 20 },
  permissionTile: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: 'rgba(255,246,240,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionTitle: { fontFamily: fonts.display, fontSize: 20, color: palette.crema, textAlign: 'center', marginTop: 4 },
  permissionText: { fontFamily: fonts.regular, color: palette.crema, fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  permissionActions: { marginTop: 6, gap: 8, alignItems: 'center' },
  permissionBtn: { height: 48, borderRadius: 16, paddingHorizontal: 18 },
  permissionBtnText: { fontSize: 15 },
  permissionLink: { fontFamily: fonts.medium, fontSize: 14, color: palette.crema, textDecorationLine: 'underline', padding: 4 },
});
