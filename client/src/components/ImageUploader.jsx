import { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Camera } from 'lucide-react';
import getCroppedImg from '../cropUtils.js';

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
        mediaWidth,
        mediaHeight
    );
}

// Foto principal del reporte: elegir o arrastrar, recortar al cuadrado (solo
// la cara: orejas y hocico) y mostrar la vista previa.
export default function ImageUploader({ onCropComplete, previewUrl, onReset }) {
    const [imgSrc, setImgSrc] = useState('');
    const [dragging, setDragging] = useState(false);
    const imgRef = useRef(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState();

    const loadFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        setCrop(undefined);
        const reader = new FileReader();
        reader.addEventListener('load', () => setImgSrc(reader.result.toString() || ''));
        reader.readAsDataURL(file);
    };

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, 1));
    };

    const handleConfirmCrop = useCallback(async () => {
        if (!imgRef.current) return;
        let cropToUse = completedCrop;
        if (!cropToUse?.width || !cropToUse?.height) {
            const { width, height } = imgRef.current;
            const size = Math.min(width, height);
            cropToUse = { unit: 'px', x: (width - size) / 2, y: (height - size) / 2, width: size, height: size };
        }
        try {
            const blob = await getCroppedImg(imgRef.current, cropToUse, 'recorte.jpg');
            onCropComplete(blob);
            setImgSrc('');
        } catch (e) {
            console.error(e);
            alert('No pudimos recortar la foto. Probá con otra.');
        }
    }, [completedCrop, onCropComplete]);

    // Vista previa ya recortada
    if (previewUrl) {
        return (
            <div className="relative h-[360px] md:h-[420px] rounded-[32px] bg-mimo-muted overflow-hidden">
                <img src={previewUrl} alt="Foto de la mascota" className="absolute inset-0 w-full h-full object-cover" />
                <button
                    type="button"
                    onClick={onReset}
                    className="absolute right-3.5 bottom-3.5 h-[42px] px-[22px] rounded-2xl bg-white border border-mimo-muted font-bold text-[15px] flex items-center gap-2 hover:border-mimo-noche"
                >
                    <Camera size={18} strokeWidth={2} />
                    Cambiar foto
                </button>
            </div>
        );
    }

    // Recorte
    if (imgSrc) {
        return (
            <div className="flex flex-col items-center gap-4 bg-white p-5 rounded-[32px]">
                <p className="m-0 text-[15px] text-center">Encuadrá solo la cara: orejas y hocico.</p>
                <div className="rounded-3xl overflow-hidden bg-mimo-muted">
                    <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={1}
                        className="max-w-full max-h-[45vh]"
                    >
                        <img ref={imgRef} alt="Recortar foto" src={imgSrc} onLoad={onImageLoad} className="max-w-full max-h-[45vh]" />
                    </ReactCrop>
                </div>
                <div className="w-full flex gap-2.5">
                    <button
                        type="button"
                        onClick={() => setImgSrc('')}
                        className="flex-1 h-[52px] rounded-2xl border-2 border-mimo-noche font-bold text-[15px] hover:bg-mimo-warm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmCrop}
                        className="flex-1 h-[52px] rounded-2xl bg-mimo-noche text-mimo-warm font-bold text-[15px] hover:bg-mimo-nocheAlt"
                    >
                        Usar esta foto
                    </button>
                </div>
            </div>
        );
    }

    // Elegir o arrastrar
    return (
        <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files?.[0]); }}
            className={`h-[360px] md:h-[420px] rounded-[32px] border-2 border-dashed border-mimo-coral flex flex-col items-center justify-center gap-3.5 px-6 text-center cursor-pointer transition-colors ${dragging ? 'bg-mimo-warm' : 'bg-white hover:bg-mimo-warm'}`}
        >
            <span className="w-20 h-20 rounded-full bg-mimo-coral flex items-center justify-center">
                <Camera size={34} strokeWidth={2} color="#FFF6F0" />
            </span>
            <b className="font-display font-black text-[22px]">Subí una foto</b>
            <span className="max-w-[300px] text-[15px] leading-[1.45]">
                Solo la cara: orejas y hocico. Es lo que mejor la distingue para encontrar coincidencias.
            </span>
            <span className="text-[13px] font-bold underline">Elegir archivo o arrastrar acá</span>
            <input type="file" accept="image/*" onChange={(e) => loadFile(e.target.files?.[0])} className="hidden" />
        </label>
    );
}
