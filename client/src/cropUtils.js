// client/src/cropUtils.js

/**
 * Esta función recibe el elemento de imagen HTML (<img>) y el objeto de recorte
 * (con coordenadas en píxeles) y genera el archivo final recortado.
 */
export default function getCroppedImg(image, crop, fileName) {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const ctx = canvas.getContext('2d');

    // Si el recorte no es válido o es 0, salimos
    if (!crop || crop.width === 0 || crop.height === 0) {
        return Promise.reject("No se seleccionó un área de recorte válida");
    }

    // Ajustamos el tamaño del canvas a la alta resolución (Retina displays, etc.)
    const pixelRatio = window.devicePixelRatio;
    canvas.width = crop.width * pixelRatio;
    canvas.height = crop.height * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingQuality = 'high';

    // Dibujamos la imagen recortada en el canvas
    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        crop.width,
        crop.height
    );

    // Convertimos el canvas a un archivo real (Blob)
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    console.error('Canvas is empty');
                    reject(new Error('Error al crear la imagen recortada (Canvas vacío)'));
                    return;
                }
                blob.name = fileName;
                resolve(blob);
            },
            'image/jpeg',
            0.95 // Calidad JPEG (0 a 1)
        );
    });
}