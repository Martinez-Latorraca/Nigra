import { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Path, Circle } from 'react-native-svg';

export default function CameraCapture({ visible, onClose, onCapture }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      onCapture(photo);
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
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

            {/* Overlay guía: cara de perro line-art */}
            <View style={styles.overlay} pointerEvents="none">
              <Text style={styles.hint}>Centrá la mascota dentro de la silueta</Text>
              <Svg width={340} height={340} viewBox="0 0 200 200">
                {/* Orejas */}
                <Path
                  d="M64,74 C40,66 30,104 50,128 C62,112 66,92 74,82 Z"
                  fill="rgba(255,255,255,0.05)"
                  stroke="#fff"
                  strokeWidth={3}
                  strokeLinejoin="round"
                />
                <Path
                  d="M136,74 C160,66 170,104 150,128 C138,112 134,92 126,82 Z"
                  fill="rgba(255,255,255,0.05)"
                  stroke="#fff"
                  strokeWidth={3}
                  strokeLinejoin="round"
                />
                {/* Cabeza */}
                <Circle
                  cx="100"
                  cy="110"
                  r="54"
                  fill="rgba(255,255,255,0.05)"
                  stroke="#fff"
                  strokeWidth={3}
                />
                {/* Ojos */}
                <Circle cx="81" cy="102" r="5" fill="#fff" />
                <Circle cx="119" cy="102" r="5" fill="#fff" />
                {/* Nariz */}
                <Path d="M90,122 Q100,115 110,122 Q105,133 100,133 Q95,133 90,122 Z" fill="#fff" />
                {/* Boca */}
                <Path
                  d="M100,133 L100,143 M100,143 Q90,151 81,145 M100,143 Q110,151 119,145"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>

            {/* Controles */}
            <Pressable style={styles.close} onPress={onClose} hitSlop={12}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
            <View style={styles.controls}>
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
  controls: { position: 'absolute', bottom: 48, left: 0, right: 0, alignItems: 'center' },
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
