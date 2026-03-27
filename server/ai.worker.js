import { parentPort } from 'worker_threads';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import mobilenet from '@tensorflow-models/mobilenet';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

let model = null;

async function loadModel() {
    if (model) return;
    await tf.setBackend('cpu');
    model = await mobilenet.load({ version: 2, alpha: 1.0 });
    console.log('✅ [Worker] Modelo cargado.');
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
loadModel().then(() => {
    // Avisamos al hilo principal que estamos listos
    parentPort.postMessage({ type: 'ready' });
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
        parentPort.postMessage({ type: 'error', id, error: error.message });
    }
});