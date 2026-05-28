import { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import Svg, { Path, Ellipse } from 'react-native-svg';

// Lado del overlay de la silueta en DP. Se usa para dibujar el SVG y para
// recortar la foto exactamente a esa región (hocico y orejas quedan dentro).
const SILHOUETTE_DP = 400;

const FLASH_CYCLE = { off: 'auto', auto: 'on', on: 'off' };
const FLASH_LABEL = { off: '⚡ Off', auto: '⚡ Auto', on: '⚡ On' };

export default function CameraCapture({ visible, onClose, onCapture }) {
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
            <Pressable style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>Dar permiso</Text>
            </Pressable>
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

            {/* Overlay guía: chow chow (silueta del asset, en blanco) */}
            <View style={styles.overlay} pointerEvents="none">
              <Text style={styles.hint}>Solo la cara: orejas y hocico dentro de la silueta</Text>
              <Svg width={SILHOUETTE_DP} height={SILHOUETTE_DP} viewBox="20 16 176 192">
                {/* Contorno cabeza / melena */}
                <Path
                  d="M 75.761327,199.70103 C 56.199471,194.08763 44.761084,189.27907 31.874729,164.14948 20.299123,135.81293 28.105713,107.10117 34.859043,93.386596 42.77099,77.269556 58.268447,47.562985 80.288658,41.505155 c 10.212881,2.900862 21.418042,5.827602 32.300722,6.606605 10.45141,-1.039704 11.12554,-1.378009 27.2165,-5.443298 18.458,3.685961 27.74306,15.089085 35.4003,30.475867 11.45371,23.814384 16.24422,33.855541 18.53416,63.514761 1.26503,40.24907 -23.15731,55.03639 -43.70942,62.87184"
                  fill="rgba(255,255,255,0.05)"
                  stroke="#fff"
                  strokeWidth={4}
                  strokeLinejoin="round"
                />
                {/* Oreja izquierda */}
                <Path
                  d="m 49.120291,67.372914 c -4.14262,-13.465636 -1.905264,-26.98134 5.142596,-40.836831 18.95454,-0.978955 23.004452,9.972639 27.302278,15.986453"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={4}
                />
                {/* Oreja derecha */}
                <Path
                  d="m 137.62017,43.233905 c 8.67526,-10.828324 19.21488,-17.560306 27.89014,-16.187514 12.88521,13.040877 4.55231,26.982022 6.29381,40.059279"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={4}
                />
                {/* Mejilla izquierda */}
                <Path
                  d="m 79.097938,119.07216 c -6.705482,7.25773 -7.794783,17.06701 -7.484536,24.32474 1.531485,8.2879 6.74721,13.54172 15.989689,15.47939 12.259675,-1.93397 18.790129,-6.58178 22.453609,-12.58763 2.68595,-6.36462 1.69771,-8.1073 1.36082,-13.60825"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={4}
                />
                {/* Mejilla derecha */}
                <Path
                  d="m 145.60824,119.75258 c 3.24364,7.60925 5.66329,13.83399 6.16499,23.01374 -0.47115,11.18225 -10.77115,15.01961 -17.35051,15.47938 -13.17393,-0.38719 -17.9863,-6.89883 -24.36602,-11.95704"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={4}
                />
                {/* Hocico */}
                <Path
                  d="m 111.41752,132.68041 c -3.60275,-0.73144 -10.56285,-4.49663 -12.247419,-8.16495 -0.527501,-4.14724 1.003679,-7.52667 6.082439,-8.67526 0.44009,-0.11104 6.41583,-0.0362 11.09797,0.17011 4.56915,1.23224 6.17551,3.71119 6.12372,8.84536 -2.90162,5.26374 -6.96711,6.93325 -11.05671,7.82474 z"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={4}
                />
                {/* Boca */}
                <Path
                  d="m 87.603091,158.87629 c 9.20334,14.65874 12.078233,19.98523 24.579899,20.49743 12.58911,-0.29357 16.20223,-10.66537 19.64691,-19.98712"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={4}
                />
                {/* Ojos */}
                <Ellipse cx="89.176544" cy="99.425255" rx="4.7314129" ry="7.1443295" fill="#fff" />
                <Ellipse cx="133.87282" cy="99.71299" rx="4.7314129" ry="7.1443295" fill="#fff" />
              </Svg>
            </View>

            {/* Controles */}
            <Pressable style={styles.close} onPress={onClose} hitSlop={12}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>

            <View style={styles.topControls}>
              <Pressable
                style={[styles.iconBtn, flash !== 'off' && styles.iconBtnActive]}
                onPress={() => setFlash((f) => FLASH_CYCLE[f])}
                hitSlop={8}
              >
                <Text style={[styles.iconBtnText, flash !== 'off' && styles.iconBtnTextActive]}>
                  {FLASH_LABEL[flash]}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.iconBtn, torch && styles.iconBtnActive]}
                onPress={() => setTorch((t) => !t)}
                hitSlop={8}
              >
                <Text style={[styles.iconBtnText, torch && styles.iconBtnTextActive]}>🔦 Luz</Text>
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                hitSlop={8}
              >
                <Text style={styles.iconBtnText}>🔄 Girar</Text>
              </Pressable>
            </View>

            <View style={styles.controls}>
              <View style={styles.zoomRow}>
                <Pressable style={styles.zoomBtn} onPress={() => stepZoom(-0.1)} hitSlop={8}>
                  <Text style={styles.zoomBtnText}>－</Text>
                </Pressable>
                <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>
                <Pressable style={styles.zoomBtn} onPress={() => stepZoom(0.1)} hitSlop={8}>
                  <Text style={styles.zoomBtnText}>＋</Text>
                </Pressable>
              </View>
              <Pressable style={styles.shutter} onPress={takePhoto}>
                <View style={styles.shutterInner} />
              </Pressable>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  hint: {
    position: 'absolute',
    top: '18%',
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 40,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
  close: { position: 'absolute', top: 56, left: 24 },
  closeText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  topControls: { position: 'absolute', top: 52, right: 20, flexDirection: 'row', gap: 10 },
  iconBtn: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  iconBtnActive: { backgroundColor: 'rgba(250,204,21,0.85)' },
  iconBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  iconBtnTextActive: { color: '#1a1a00' },
  controls: { position: 'absolute', bottom: 48, left: 0, right: 0, alignItems: 'center', gap: 18 },
  zoomRow: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  zoomBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  zoomBtnText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  zoomLabel: { color: '#fff', fontSize: 14, fontWeight: '700', minWidth: 44, textAlign: 'center' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  permission: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center', lineHeight: 22 },
  permissionBtn: { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14 },
  permissionBtnText: { color: '#000', fontWeight: '700', fontSize: 15 },
  cancelText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
});
