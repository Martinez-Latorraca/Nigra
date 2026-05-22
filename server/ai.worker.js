import { parentPort } from 'worker_threads';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import mobilenet from '@tensorflow-models/mobilenet';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

let model = null;

async function loadModel(retries = 4) {
    if (model) return;
    await tf.setBackend('cpu');
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            model = await mobilenet.load({ version: 2, alpha: 1.0 });
            console.log('✅ [Worker] Modelo cargado.');
            return;
        } catch (err) {
            console.error(`⚠️ [Worker] Falló carga del modelo (intento ${attempt}/${retries}): ${err.message}`);
            if (attempt === retries) throw err;
            await new Promise((r) => setTimeout(r, 1500 * attempt));
        }
    }
}

function imageToTensor(buffer) {
    let values, width, height;

    try {
        const jpegData = jpeg.decode(buffer, { useTArray: true });
        values = jpegData.data;
        width = jpegData.width;
        height = jpegData.height;
    } catch (e) {
        try {
            const pngData = PNG.sync.read(buffer);
            values = pngData.data;
            width = pngData.width;
            height = pngData.height;
        } catch (err) {
            throw new Error('Formato de imagen no soportado (solo JPG o PNG)');
        }
    }

    const numChannels = 3;
    const valuesRGB = new Float32Array(width * height * numChannels);

    for (let i = 0; i < width * height; i++) {
        const rgbaIndex = i * 4;
        const rgbIndex = i * 3;
        valuesRGB[rgbIndex] = values[rgbaIndex];
        valuesRGB[rgbIndex + 1] = values[rgbaIndex + 1];
        valuesRGB[rgbIndex + 2] = values[rgbaIndex + 2];
    }

    return tf.tensor3d(valuesRGB, [height, width, numChannels], 'int32');
}

// Cargamos el modelo apenas arranca el worker
loadModel()
    .then(() => {
        // Avisamos al hilo principal que estamos listos
        parentPort.postMessage({ type: 'ready' });
    })
    .catch((err) => {
        console.error('❌ [Worker] No se pudo cargar el modelo tras reintentos:', err);
        process.exit(1);
    });

// Escuchamos trabajos del hilo principal
parentPort.on('message', async ({ id, imageBuffer }) => {
    try {
        if (!model) await loadModel();

        const buffer = Buffer.from(imageBuffer);
        const imageTensor = imageToTensor(buffer);
        const embedding = model.infer(imageTensor, true);
        const vector = await embedding.array();
        const cleanVector = Array.from(vector).slice(0, 1280)[0];

        imageTensor.dispose();
        embedding.dispose();

        parentPort.postMessage({ type: 'result', id, vector: cleanVector });
    } catch (error) {
        console.error('❌ [Worker] Error en el job:', error);
        parentPort.postMessage({ type: 'error', id, error: error.stack || error.message });
    }
});