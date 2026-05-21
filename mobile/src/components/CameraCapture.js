import { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Path, Ellipse } from 'react-native-svg';

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

            {/* Overlay guía: chow chow de frente (line-art) */}
            <View style={styles.overlay} pointerEvents="none">
              <Text style={styles.hint}>Centrá la mascota dentro de la silueta</Text>
              <Svg width={400} height={400} viewBox="0 0 200 200">
                {/* Contorno de la cabeza (orejas + melena + mentón) */}
                <Path
                  d="M100,40 C96,33 90,32 86,37 C80,25 62,26 56,44 C42,48 33,64 36,86 C30,104 33,128 48,143 C60,160 80,167 100,167 C120,167 140,160 152,143 C167,128 170,104 164,86 C167,64 158,48 144,44 C138,26 120,25 114,37 C110,32 104,33 100,40 Z"
                  fill="rgba(255,255,255,0.05)"
                  stroke="#fff"
                  strokeWidth={3}
                  strokeLinejoin="round"
                />
                {/* Cara interior (mejillas / hocico) */}
                <Path
                  d="M100,104 C110,96 126,99 130,116 C134,133 119,148 100,148 C81,148 66,133 70,116 C74,99 90,96 100,104 Z"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2.5}
                />
                {/* Ojos */}
                <Ellipse cx="82" cy="98" rx="5.5" ry="8.5" fill="#fff" />
                <Ellipse cx="118" cy="98" rx="5.5" ry="8.5" fill="#fff" />
                {/* Nariz */}
                <Path d="M91,114 Q100,108 109,114 Q108,124 100,125 Q92,124 91,114 Z" fill="#fff" />
                {/* Boca */}
                <Path
                  d="M100,125 L100,133 M100,133 Q90,141 82,134 M100,133 Q110,141 118,134"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2.5}
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
