import React, { useRef } from 'react';

interface UploaderProps {
  onUpload: (files: File[]) => void;
  variant?: 'sidebar' | 'full';
}

const Uploader: React.FC<UploaderProps> = ({ onUpload, variant = 'sidebar' }) => {
// --- PARTIAL FIX ---
  const inputRef = useRef<HTMLInputElement>(null);
  const isFull = variant === 'full';

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onUpload(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onUpload(Array.from(e.target.files));
  };

  return (
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={`
      w-full transition-all group cursor-pointer flex flex-col items-center justify-center
      ${isFull 
        ? 'h-full p-24 border-4 border-dashed border-slate-800 bg-slate-950/20 hover:bg-slate-900/40 hover:border-blue-500' 
        : 'p-4 border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/40 hover:border-blue-500/50'}
    `}
    onClick={() => inputRef.current?.click()}
  >
    <input type="file" multiple hidden ref={inputRef} accept="image/*" onChange={handleChange} />
    <div className={`flex ${isFull ? 'flex-col' : 'items-center'} items-center gap-4`}>
      <div className={`${isFull ? 'p-8 bg-slate-900' : 'p-1.5 bg-slate-800'} rounded-2xl group-hover:bg-blue-600/10 transition-colors`}>
        <svg xmlns="http://www.w3.org/2000/svg" className={`${isFull ? 'h-24 w-24' : 'h-4 w-4'} text-slate-500 group-hover:text-blue-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </div>
      <div className={`flex flex-col ${isFull ? 'items-center text-center' : ''}`}>
        <span className={`${isFull ? 'text-2xl' : 'text-[10px]'} font-bold text-slate-400 uppercase tracking-wider leading-none`}>
          {isFull ? 'Drop Comic Pages Here' : 'Upload Pages'}
        </span>
        <span className={`${isFull ? 'text-sm mt-3' : 'text-[8px] mt-1'} text-slate-600 uppercase`}>
          {isFull ? 'Click to browse or drag and drop images' : 'Images Only (A-Z)'}
        </span>
      </div>
    </div>
  </div>
);
};

export default Uploader;