import React, { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

export default function CameraCapture({ t, onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } } })
      .then((s) => {
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
        setReady(true);
      })
      .catch(() => {
        toast.error("Camera not available");
        onClose();
      });
    return () => streamRef.current?.getTracks().forEach((tr) => tr.stop());
  }, []);

  const capture = () => {
    const v = videoRef.current;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    onCapture(c.toDataURL("image/jpeg", 0.9));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4" data-testid="camera-modal">
      <div className="relative w-full max-w-2xl border border-cyan-500/40 scanline overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-[70vh] object-contain bg-black" />
        <div className="absolute inset-6 border-2 border-dashed border-cyan-400/50 pointer-events-none" />
      </div>
      <div className="flex gap-3 mt-6">
        <Button onClick={capture} disabled={!ready} className="btn-cyber h-12 px-8" data-testid="camera-capture-btn">
          <Camera className="w-5 h-5 me-2" /> {t("camera_capture")}
        </Button>
        <Button variant="outline" onClick={onClose} className="h-12 border-white/20" data-testid="camera-close-btn">
          <X className="w-5 h-5 me-2" /> {t("camera_close")}
        </Button>
      </div>
    </div>
  );
}
