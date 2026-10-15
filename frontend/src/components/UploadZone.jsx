import React, { useRef, useState } from "react";
import { Button } from "./ui/button";
import { Upload, Camera, FileText, X, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import CameraCapture from "./CameraCapture";

const readFile = (file) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

const countPdfPages = async (dataUrl) => {
  const bin = atob(dataUrl.split(",")[1]);
  const m = bin.match(/\/Type\s*\/Page[^s]/g);
  return m ? m.length : 1;
};

export default function UploadZone({ t, onAnalyze, analyzing }) {
  const [files, setFiles] = useState([]);
  const [drag, setDrag] = useState(false);
  const [camera, setCamera] = useState(false);
  const inputRef = useRef(null);
  const totalPages = files.reduce((s, f) => s + f.pages, 0);

  const addItems = (items) => {
    const sum = totalPages + items.reduce((s, f) => s + f.pages, 0);
    if (sum > 3) return toast.error(t("max_3_files"));
    setFiles((prev) => [...prev, ...items]);
  };

  const handleFiles = async (list) => {
    const items = [];
    for (const f of Array.from(list)) {
      if (!f.type.startsWith("image/") && f.type !== "application/pdf") continue;
      const data = await readFile(f);
      const pages = f.type === "application/pdf" ? await countPdfPages(data) : 1;
      items.push({ name: f.name, mime_type: f.type, data, pages });
    }
    addItems(items);
  };

  const onCapture = (data) => {
    addItems([{ name: `scan-${Date.now()}.jpg`, mime_type: "image/jpeg", data, pages: 1 }]);
    setCamera(false);
  };

  return (
    <div className="border border-white/10 bg-[#121214] p-6 lg:p-8" data-testid="upload-zone">
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="font-display text-xl lg:text-2xl font-semibold mb-1">{t("upload_title")}</h2>
          <p className="text-sm text-zinc-500">{t("upload_hint")}</p>
        </div>
        <span className="text-xs font-mono text-cyan-400 border border-cyan-500/30 px-2 py-1 shrink-0" data-testid="page-counter">{totalPages}/3</span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer border-2 border-dashed p-10 text-center transition-colors duration-300 ${drag ? "border-cyan-400 bg-cyan-500/5" : "border-white/15 hover:border-cyan-500/50"}`}
        data-testid="dropzone"
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-cyan-400" strokeWidth={1.5} />
        <p className="text-zinc-300">{t("drag_drop")}</p>
        <input ref={inputRef} type="file" multiple accept="image/*,application/pdf" className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} data-testid="file-input" />
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <Button variant="outline" onClick={() => setCamera(true)} className="border-cyber h-11" data-testid="scan-camera-btn">
          <Camera className="w-4 h-4 me-2" /> {t("scan_camera")}
        </Button>
      </div>

      {files.length > 0 && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="file-list">
          {files.map((f, i) => (
            <div key={i} className="relative border border-white/10 bg-[#0A0A0B] p-2 group" data-testid={`file-item-${i}`}>
              {f.mime_type.startsWith("image/") ? (
                <img src={f.data} alt="" className="w-full h-28 object-cover" />
              ) : (
                <div className="h-28 flex flex-col items-center justify-center text-zinc-400">
                  <FileText className="w-8 h-8 mb-1 text-cyan-400" />
                  <span className="text-xs">{f.pages} {t("page")}</span>
                </div>
              )}
              <p className="text-xs truncate mt-2 text-zinc-500">{f.name}</p>
              <button onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="absolute top-1 end-1 bg-black/80 p-1 hover:bg-[#FF3366]" data-testid={`remove-file-${i}`}>
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Button
        onClick={() => onAnalyze(files)}
        disabled={!files.length || analyzing}
        className="btn-cyber w-full h-14 mt-6 text-base"
        data-testid="analyze-btn"
      >
        {analyzing ? <><Loader2 className="w-5 h-5 me-2 animate-spin" /> {t("analyzing")}</> : <><Sparkles className="w-5 h-5 me-2" /> {t("analyze_now")}</>}
      </Button>

      {camera && <CameraCapture t={t} onCapture={onCapture} onClose={() => setCamera(false)} />}
    </div>
  );
}
