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

            {/* Overlay guía: chow chow de frente (line-art) */}
            <View style={styles.overlay} pointerEvents="none">
              <Text style={styles.hint}>Centrá la mascota dentro de la silueta</Text>
              <Svg width={340} height={340} viewBox="0 0 200 200">
                {/* Melena esponjosa (contorno ondulado) */}
                <Path
                  d="M100,50 Q119.8,39.1 129.4,59.5 Q151.8,62.4 147.6,84.5 Q164,100 147.6,115.5 Q151.8,137.6 129.4,140.5 Q119.8,160.9 100,150 Q80.2,160.9 70.6,140.5 Q48.2,137.6 52.4,115.5 Q36,100 52.4,84.5 Q48.2,62.4 70.6,59.5 Q80.2,39.1 100,50 Z"
                  fill="rgba(255,255,255,0.05)"
                  stroke="#fff"
                  strokeWidth={3}
                  strokeLinejoin="round"
                />
                {/* Cara interior */}
                <Path
                  d="M100,72 C124,72 138,90 138,110 C138,132 122,146 100,146 C78,146 62,132 62,110 C62,90 76,72 100,72 Z"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2.5}
                />
                {/* Ojos */}
                <Circle cx="85" cy="104" r="4.5" fill="#fff" />
                <Circle cx="115" cy="104" r="4.5" fill="#fff" />
                {/* Nariz */}
                <Path d="M91,120 Q100,114 109,120 Q105,129 100,129 Q95,129 91,120 Z" fill="#fff" />
                {/* Boca / lengua */}
                <Path
                  d="M100,129 L100,136 M100,136 Q91,143 84,138 M100,136 Q109,143 116,138"
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
