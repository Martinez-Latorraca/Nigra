import multer from 'multer';

const storage = multer.memoryStorage();

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
    'image/svg+xml',
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