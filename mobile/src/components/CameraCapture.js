import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import Svg, { Path, Ellipse } from 'react-native-svg';
import { palette, fonts } from '../lib/theme';
import { X, Zap, ZapOff, Flashlight, SwitchCamera, Minus, Plus } from '../lib/icons';
import Button from './Button';

// Lado del overlay de la silueta en DP. Se usa para dibujar el SVG y para
// recortar la foto exactamente a esa región (hocico y orejas quedan dentro).
const SILHOUETTE_DP = 400;

const FLASH_CYCLE = { off: 'auto', auto: 'on', on: 'off' };
const FLASH_LABEL = { off: 'Off', auto: 'Auto', on: 'On' };

export default function CameraCapture({ visible, onClose, onCapture }) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState('off');
  const [facing, setFacing] = useState('back');
  const [torch, setTorch] = useState(false);
  const [zoom, setZoom] = useState(0);

  const stepZoom = (delta) => setZoom((z) => Math.min(1, Math.max(0, Math.round((z + delta) * 100) / 100)));

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      // Recortamos al cuadrado que ocupa la silueta en pantalla. El preview usa
      // "cover" (escala la foto para llenar la pantalla, centrada), así que
      // convertimos los 400 DP del SVG a píxeles de la foto con esa misma escala.
      const { width: screenW, height: screenH } = Dimensions.get('window');
      const coverScale = Math.max(screenW / photo.width, screenH / photo.height);
      const size = Math.min(Math.round(SILHOUETTE_DP / coverScale), photo.width, photo.height);
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
      <View style={styles.container}>
        {!permission?.granted ? (
          <View style={styles.permission}>
            <Text style={styles.permissionText}>
              Necesitamos acceso a la cámara para tomar la foto de la mascota.
            </Text>
            <Button title="Dar permiso" onPress={requestPermission} style={styles.permissionBtn} />
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
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

            {/* Overlay guía: chow chow (silueta del asset, en Crema) */}
            <View style={styles.overlay} pointerEvents="none">
              <View style={[styles.hint, { top: insets.top + 96 }]}>
                <Text style={styles.hintTitle}>Encuadrá la cara</Text>
                <Text style={styles.hintText}>Orejas y hocico dentro de la silueta</Text>
              </View>
              <Svg width={SILHOUETTE_DP} height={SILHOUETTE_DP} viewBox="20 16 176 192">
                {/* Contorno cabeza / melena */}
                <Path
                  d="M 75.761327,199.70103 C 56.199471,194.08763 44.761084,189.27907 31.874729,164.14948 20.299123,135.81293 28.105713,107.10117 34.859043,93.386596 42.77099,77.269556 58.268447,47.562985 80.288658,41.505155 c 10.212881,2.900862 21.418042,5.827602 32.300722,6.606605 10.45141,-1.039704 11.12554,-1.378009 27.2165,-5.443298 18.458,3.685961 27.74306,15.089085 35.4003,30.475867 11.45371,23.814384 16.24422,33.855541 18.53416,63.514761 1.26503,40.24907 -23.15731,55.03639 -43.70942,62.87184"
                  fill="rgba(255,255,255,0.05)"
                  stroke={palette.crema}
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
                {/* Oreja izquierda */}
                <Path
                  d="m 49.120291,67.372914 c -4.14262,-13.465636 -1.905264,-26.98134 5.142596,-40.836831 18.95454,-0.978955 23.004452,9.972639 27.302278,15.986453"
                  fill="none"
                  stroke={palette.crema}
                  strokeWidth={4}
                />
                {/* Oreja derecha */}
                <Path
                  d="m 137.62017,43.233905 c 8.67526,-10.828324 19.21488,-17.560306 27.89014,-16.187514 12.88521,13.040877 4.55231,26.982022 6.29381,40.059279"
                  fill="none"
                  stroke={palette.crema}
                  strokeWidth={4}
                />
                {/* Mejilla izquierda */}
                <Path
                  d="m 79.097938,119.07216 c -6.705482,7.25773 -7.794783,17.06701 -7.484536,24.32474 1.531485,8.2879 6.74721,13.54172 15.989689,15.47939 12.259675,-1.93397 18.790129,-6.58178 22.453609,-12.58763 2.68595,-6.36462 1.69771,-8.1073 1.36082,-13.60825"
                  fill="none"
                  stroke={palette.crema}
                  strokeWidth={4}
                />
                {/* Mejilla derecha */}
                <Path
                  d="m 145.60824,119.75258 c 3.24364,7.60925 5.66329,13.83399 6.16499,23.01374 -0.47115,11.18225 -10.77115,15.01961 -17.35051,15.47938 -13.17393,-0.38719 -17.9863,-6.89883 -24.36602,-11.95704"
                  fill="none"
                  stroke={palette.crema}
                  strokeWidth={4}
                />
                {/* Hocico */}
                <Path
                  d="m 111.41752,132.68041 c -3.60275,-0.73144 -10.56285,-4.49663 -12.247419,-8.16495 -0.527501,-4.14724 1.003679,-7.52667 6.082439,-8.67526 0.44009,-0.11104 6.41583,-0.0362 11.09797,0.17011 4.56915,1.23224 6.17551,3.71119 6.12372,8.84536 -2.90162,5.26374 -6.96711,6.93325 -11.05671,7.82474 z"
                  fill="none"
                  stroke={palette.crema}
                  strokeWidth={4}
                />
                {/* Boca */}
                <Path
                  d="m 87.603091,158.87629 c 9.20334,14.65874 12.078233,19.98523 24.579899,20.49743 12.58911,-0.29357 16.20223,-10.66537 19.64691,-19.98712"
                  fill="none"
                  stroke={palette.crema}
                  strokeWidth={4}
                />
                {/* Ojos */}
                <Ellipse cx="89.176544" cy="99.425255" rx="4.7314129" ry="7.1443295" fill={palette.crema} />
                <Ellipse cx="133.87282" cy="99.71299" rx="4.7314129" ry="7.1443295" fill={palette.crema} />
              </Svg>
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

            {/* Zoom + disparador */}
            <View style={[styles.controls, { bottom: insets.bottom + 40 }]}>
              <View style={styles.zoomRow}>
                <Pressable style={styles.zoomBtn} onPress={() => stepZoom(-0.1)} hitSlop={8} accessibilityLabel="Alejar">
                  <Minus size={20} color={palette.crema} strokeWidth={2} />
                </Pressable>
                <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
                <Pressable style={styles.zoomBtn} onPress={() => stepZoom(0.1)} hitSlop={8} accessibilityLabel="Acercar">
                  <Plus size={20} color={palette.crema} strokeWidth={2} />
                </Pressable>
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

const DIM = 'rgba(26,26,46,0.55)';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.noche },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
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
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  permissionText: { fontFamily: fonts.regular, color: palette.crema, fontSize: 16, textAlign: 'center', lineHeight: 22 },
  permissionBtn: { alignSelf: 'stretch' },
  cancelText: { fontFamily: fonts.bold, color: palette.crema, fontSize: 14 },
});
