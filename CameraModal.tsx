import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RefreshCw, Check, RotateCcw, RotateCw, Download } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsePhoto: (blob: Blob) => void;
  showNotification: (msg: string, isError: boolean) => void;
}

export default function CameraModal({ isOpen, onClose, onUsePhoto, showNotification }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoCaptured, setPhotoCaptured] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [originalPhotoDataURL, setOriginalPhotoDataURL] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    setPhotoCaptured(false);
    setRotationAngle(0);
    setOriginalPhotoDataURL(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera: ", err);
      showNotification("Não foi possível acessar a câmera. Verifique as permissões.", true);
      onClose();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setOriginalPhotoDataURL(dataUrl);
      setPhotoCaptured(true);
      setRotationAngle(0);
    }
  };

  const retryPhoto = () => {
    startCamera();
  };

  const drawRotatedImage = (angle: number) => {
    if (!originalPhotoDataURL || !canvasRef.current) return;

    const img = new Image();
    img.src = originalPhotoDataURL;
    img.onload = () => {
      const canvas = canvasRef.current!;
      const context = canvas.getContext('2d');
      if (!context) return;

      let newWidth = img.width;
      let newHeight = img.height;
      if (angle === 90 || angle === 270) {
        newWidth = img.height;
        newHeight = img.width;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.save();
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((angle * Math.PI) / 180);
      context.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      context.restore();
    };
  };

  const rotateLeft = () => {
    const newAngle = (rotationAngle - 90 + 360) % 360;
    setRotationAngle(newAngle);
    drawRotatedImage(newAngle);
  };

  const rotateRight = () => {
    const newAngle = (rotationAngle + 90) % 360;
    setRotationAngle(newAngle);
    drawRotatedImage(newAngle);
  };

  const downloadPhoto = () => {
    if (!canvasRef.current || !photoCaptured) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'foto_capturada.jpg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification("Foto baixada!", false);
    }, 'image/jpeg', 0.95);
  };

  const handleUsePhoto = () => {
    if (!canvasRef.current || !photoCaptured) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onUsePhoto(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-2xl rounded-xl bg-zinc-900 p-6 shadow-2xl border border-zinc-700">
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-amber-400 transition-colors">
          <X size={32} />
        </button>
        <h2 className="text-2xl font-bold text-zinc-100 mb-4">Tirar Foto</h2>
        
        <div className="relative w-full bg-black rounded-lg overflow-hidden border border-zinc-800 flex justify-center items-center min-h-[300px]">
          {!photoCaptured ? (
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto max-h-[60vh] object-contain" />
          ) : (
            <canvas ref={canvasRef} className="w-full h-auto max-h-[60vh] object-contain" />
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!photoCaptured ? (
            <button onClick={takePhoto} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-900 font-bold py-3 px-6 rounded-lg shadow-lg transition-all">
              <Camera size={20} /> Capturar Foto
            </button>
          ) : (
            <>
              <button onClick={retryPhoto} className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2 px-4 rounded-lg transition-all">
                <RefreshCw size={18} /> Tentar Novamente
              </button>
              <button onClick={rotateLeft} className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2 px-4 rounded-lg transition-all">
                <RotateCcw size={18} /> Girar Esq.
              </button>
              <button onClick={rotateRight} className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2 px-4 rounded-lg transition-all">
                <RotateCw size={18} /> Girar Dir.
              </button>
              <button onClick={downloadPhoto} className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white font-medium py-2 px-4 rounded-lg transition-all">
                <Download size={18} /> Salvar
              </button>
              <button onClick={handleUsePhoto} className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-900 font-bold py-2 px-6 rounded-lg shadow-lg transition-all">
                <Check size={20} /> Usar Foto
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
