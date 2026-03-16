// server/ai.js
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu'; // Necesario para que funcione sin tarjeta gráfica
import mobilenet from '@tensorflow-models/mobilenet';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

let model = null;

// Cargar modelo
export async function loadModel() {
    if (model) return;
    console.log('⏳ Cargando modelo de IA (Versión JS Pura)...');
    // Usamos backend CPU explícitamente para evitar errores
    await tf.setBackend('cpu');
    model = await mobilenet.load({ version: 2, alpha: 1.0 });
    console.log('✅ Modelo cargado.');
}

// Función auxiliar para convertir Buffer de imagen a Tensor
function imageToTensor(buffer) {
    let values;
    let width;
    let height;

    try {
        // Intentar decodificar como JPEG
        const jpegData = jpeg.decode(buffer, { useTArray: true });
        values = jpegData.data;
        width = jpegData.width;
        height = jpegData.height;
    } catch (e) {
        try {
            // Si falla, intentar como PNG
            const pngData = PNG.sync.read(buffer);
            values = pngData.data;
            width = pngData.width;
            height = pngData.height;
        } catch (err) {
            throw new Error('Formato de imagen no soportado (solo JPG o PNG)');
        }
    }

    // Las imágenes decodificadas tienen 4 canales (RGBA), MobileNet necesita 3 (RGB)
    const numChannels = 3;
    const valuesRGB = new Float32Array(width * height * numChannels);

    for (let i = 0; i < width * height; i++) {
        const rgbaIndex = i * 4;
        const rgbIndex = i * 3;
        valuesRGB[rgbIndex] = values[rgbaIndex];     // Red
        valuesRGB[rgbIndex + 1] = values[rgbaIndex + 1]; // Green
        valuesRGB[rgbIndex + 2] = values[rgbaIndex + 2]; // Blue
        // Ignoramos el canal Alpha (transparencia)
    }

    // Crear el tensor 3D [alto, ancho, canales]
    return tf.tensor3d(valuesRGB, [height, width, numChannels], 'int32');
}

export async function generateEmbedding(imageBuffer) {
    if (!model) await loadModel();

    // 1. Convertir buffer a tensor manualmente
    const imageTensor = imageToTensor(imageBuffer);

    // 2. Obtener vector
    const embedding = model.infer(imageTensor, true);

    // 3. Limpiar y retornar
    const vector = await embedding.array();

    imageTensor.dispose();
    embedding.dispose();

    return vector[0];
}