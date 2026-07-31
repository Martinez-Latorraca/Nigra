import { parentPort } from 'worker_threads';
import mobilenet from '@tensorflow-models/mobilenet';

// Dual backend: en Render (Linux) usamos tfjs-node nativo (~50x más rápido);
// si no está disponible (ej. dev local en Windows sin binario), caemos a
// tfjs puro con jpeg-js/pngjs. La API que usa el resto del código no cambia.
let tf;
let decodeImage;
let backendName;

async function setupBackend() {
  try {
    tf = await import('@tensorflow/tfjs-node');
    decodeImage = (buffer) => tf.node.decodeImage(buffer, 3);
    backendName = 'tfjs-node';
    console.log('✅ [Worker] Backend: tfjs-node (TF nativo).');
  } catch (err) {
    console.error('⚠️ [Worker] No se pudo cargar tfjs-node, motivo:', err?.message || err);
    tf = await import('@tensorflow/tfjs');
    await import('@tensorflow/tfjs-backend-cpu');
    await tf.setBackend('cpu');
    const jpeg = (await import('jpeg-js')).default;
    const { PNG } = await import('pngjs');
    decodeImage = (buffer) => {
      let values, width, height;
      try {
        const data = jpeg.decode(buffer, { useTArray: true });
        values = data.data; width = data.width; height = data.height;
      } catch {
        try {
          const data = PNG.sync.read(buffer);
          values = data.data; width = data.width; height = data.height;
        } catch {
          throw new Error('Formato de imagen no soportado (solo JPG o PNG)');
        }
      }
      const rgb = new Float32Array(width * height * 3);
      for (let i = 0; i < width * height; i++) {
        rgb[i * 3] = values[i * 4];
        rgb[i * 3 + 1] = values[i * 4 + 1];
        rgb[i * 3 + 2] = values[i * 4 + 2];
      }
      return tf.tensor3d(rgb, [height, width, 3], 'int32');
    };
    backendName = 'tfjs-cpu';
    console.log('⚠️ [Worker] Backend: tfjs CPU puro (fallback lento).');
  }
}

let model = null;

async function loadModel(retries = 4) {
  if (model) return;
  if (!tf) await setupBackend();
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

// Cargamos el modelo al arrancar el worker.
loadModel()
  .then(() => parentPort.postMessage({ type: 'ready' }))
  .catch((err) => {
    console.error('❌ [Worker] No se pudo cargar el modelo tras reintentos:', err);
    process.exit(1);
  });

const mb = (n) => Math.round(n / 1024 / 1024);

// Lado máximo del tensor antes de inferir.
const MAX_DIM = 640;

// Acota el tamaño del tensor decodificado.
//
// Por qué: MobileNet redimensiona a 224x224 internamente (resizeBilinear), así
// que decodificar a resolución completa es desperdicio puro — el modelo nunca
// ve esos píxeles, pero la RAM sí los paga. Una foto de 2160x2160 (las hay en
// producción) son 56MB de tensor, y en búsqueda el TTA crea 4 variantes →
// ~224MB. Sobre los ~347MB de base, eso desborda los 512MB del free de Render
// y el worker muere (ai.js lo reinicia, así que se ve como "la búsqueda falló"
// en vez de un crash evidente).
//
// Por qué 640 y no menos: medido sobre fotos reales de la app, bajar a 640
// mueve el embedding 0.003 en distancia coseno — contra un umbral de match de
// 0.25 y una separación típica de 0.69 entre mascotas distintas. Es ruido.
// A 320 el drift sube ~10x (0.016-0.028). 640 además deja resolución de sobra
// para un detect+crop futuro.
//
// No agranda si la foto ya es chica: no aportaría información y MobileNet la
// escala igual.
function clampSize(tensor) {
  const [h, w] = tensor.shape;
  const longest = Math.max(h, w);
  if (longest <= MAX_DIM) return tensor;

  const scale = MAX_DIM / longest;
  const resized = tf.tidy(() =>
    tf.image
      .resizeBilinear(tensor.toFloat(), [Math.round(h * scale), Math.round(w * scale)], true)
      .toInt()
  );
  tensor.dispose(); // liberamos el grande cuanto antes
  return resized;
}

// TTA: genera variantes de la imagen para que la búsqueda sea más tolerante
// con fotos de baja calidad (brillo distinto, mascota mirando al otro lado).
// Cada variante produce su embedding y la query SQL toma LEAST(dist) por mascota.
function makeVariants(tensor) {
  return tf.tidy(() => [
    tensor.clone(),
    tf.reverse(tensor, [1]),                                          // flip horizontal
    tf.clipByValue(tensor.toFloat().add(25), 0, 255).toInt(),         // brillo +25
  ]);
}

parentPort.on('message', async ({ id, imageBuffer, variants }) => {
  const t0 = Date.now();
  try {
    if (!model) await loadModel();
    const buffer = Buffer.from(imageBuffer);
    const decoded = decodeImage(buffer);
    const decodedShape = decoded.shape.join('x');
    // Acotamos ANTES del TTA: es donde el tamaño se multiplica por 4.
    const baseTensor = clampSize(decoded);
    const finalShape = baseTensor.shape.join('x');
    const resizeNote = decodedShape === finalShape ? '' : ` (achicado desde ${decodedShape})`;
    console.log(
      `[Worker] job ${id}: tensor ${finalShape}${resizeNote} en ${Date.now() - t0}ms | rss=${mb(process.memoryUsage().rss)}MB | backend=${backendName}`
    );

    const tensors = variants ? makeVariants(baseTensor) : [baseTensor];
    if (variants) baseTensor.dispose();

    const vectors = [];
    for (const t of tensors) {
      const embedding = model.infer(t, true);
      const arr = await embedding.array();
      vectors.push(Array.from(arr).slice(0, 1280)[0]);
      t.dispose();
      embedding.dispose();
    }

    console.log(
      `[Worker] job ${id}: infer OK x${vectors.length} en ${Date.now() - t0}ms | rss=${mb(process.memoryUsage().rss)}MB`
    );
    parentPort.postMessage({ type: 'result', id, vectors });
  } catch (error) {
    console.error(`❌ [Worker] Error en job ${id} (${Date.now() - t0}ms):`, error);
    parentPort.postMessage({ type: 'error', id, error: error.stack || error.message });
  }
});
