import { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import getCroppedImg from '../cropUtils.js'; 

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
    return centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
        mediaWidth,
        mediaHeight
    );
}

export default function ImageUploader({ onCropComplete, previewUrl, onReset }) {
    const [imgSrc, setImgSrc] = useState('');
    const imgRef = useRef(null);
    const [crop, setCrop] = useState();
    const [completedCrop, setCompletedCrop] = useState();

    const onSelectFile = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setCrop(undefined);
            const reader = new FileReader();
            reader.addEventListener('load', () => setImgSrc(reader.result.toString() || ''));
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, 1 / 1));
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
            onCropComplete(blob); // Enviamos el blob al App.jsx
            setImgSrc('');
        } catch (e) {
            console.error(e);
            alert("Error al recortar la imagen.");
        }
    }, [completedCrop, onCropComplete]);

    // VISTA 1: Mostrar preview de la imagen ya recortada
    if (previewUrl) {
        return (
            <div className="flex flex-col items-center">
                <img src={previewUrl} alt="Preview" className="w-40 h-40  border-2 border-green-500 object-cover shadow-lg" />
                <button
                    onClick={onReset}
                    className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                >
                    Cambiar foto
                </button>
            </div>
        );
    }

    // VISTA 2: El editor de recorte
    if (imgSrc) {
        return (
            <div className="flex flex-col items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-gray-600 mb-4 text-sm font-medium">Arrastra las esquinas para seleccionar SOLO la cara</p>
                <ReactCrop
                    crop={crop}
                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={1}
                    className="max-w-full max-h-[50vh] rounded-lg overflow-hidden shadow-inner"
                >
                    <img ref={imgRef} alt="Crop me" src={imgSrc} onLoad={onImageLoad} className="max-w-full max-h-[50vh]" />
                </ReactCrop>
                <button
                    onClick={handleConfirmCrop}
                    className="mt-6 px-6 py-3 bg-green-500 text-white rounded-full font-bold hover:bg-green-600 transition-colors shadow-md"
                >
                    ✂️ Confirmar Recorte
                </button>
            </div>
        );
    }

    // VISTA 3: Botón inicial de subida
    return (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <span className="text-4xl mb-2">📁</span>
                <p className="text-lg text-gray-500 font-medium">Toca para subir foto</p>
                <p className="text-sm text-gray-400 mt-1">PNG, JPG hasta 10MB</p>
            </div>
            <input type="file" accept="image/*" onChange={onSelectFile} className="hidden" />
        </label>
    );
}