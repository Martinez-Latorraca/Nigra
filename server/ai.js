import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let worker = null;
let workerReady = false;

// Cola de trabajos pendientes: id → { resolve, reject }
const pending = new Map();
let nextId = 0;

function createWorker() {
    worker = new Worker(path.join(__dirname, 'ai.worker.js'));

    worker.on('message', ({ type, id, vector, error }) => {
        if (type === 'ready') {
            workerReady = true;
            console.log('✅ [AI] Worker listo para recibir trabajo.');
            return;
        }

        const job = pending.get(id);
        if (!job) return;
        pending.delete(id);

        if (type === 'result') {
            job.resolve(vector);
        } else {
            job.reject(new Error(error));
        }
    });

    worker.on('error', (err) => {
        console.error('❌ [AI Worker] Error crítico:', err);
        // Rechazamos todos los trabajos pendientes
        for (const [id, job] of pending.entries()) {
            job.reject(err);
            pending.delete(id);
        }
        // Recreamos el worker
        workerReady = false;
        createWorker();
    });

    worker.on('exit', (code) => {
        if (code !== 0) {
            console.error(`❌ [AI Worker] Salió con código ${code}, recreando...`);
            workerReady = false;
            createWorker();
        }
    });
}

export async function loadModel() {
    if (worker) return;
    console.log('⏳ [AI] Iniciando worker thread...');
    createWorker();

    // Esperamos a que el worker cargue el modelo
    await new Promise((resolve) => {
        const interval = setInterval(() => {
            if (workerReady) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });
}

export async function generateEmbedding(imageBuffer) {
    if (!worker || !workerReady) await loadModel();

    const id = nextId++;

    return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });

        // Transferimos el buffer al worker sin copiarlo en memoria
        const arrayBuffer = imageBuffer.buffer.slice(
            imageBuffer.byteOffset,
            imageBuffer.byteOffset + imageBuffer.byteLength
        );

        worker.postMessage({ id, imageBuffer: arrayBuffer }, [arrayBuffer]);
    });
}