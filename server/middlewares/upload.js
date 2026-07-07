import multer from 'multer';

const storage = multer.memoryStorage();

// No aceptamos image/svg+xml: SVGs pueden llevar <script>. No los renderizamos
// como HTML hoy pero cualquier futura path que use dangerouslySetInnerHTML o
// similar sería XSS. Rechazar en el borde es más barato que auditar todos los
// usos.
const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/heic',
    'image/heif',
    'image/avif',
];

export const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB máximo
    fileFilter: (req, file, cb) => {
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato de imagen no soportado'), false);
        }
    }
});