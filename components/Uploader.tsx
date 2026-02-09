import React, { useRef } from 'react';

interface UploaderProps {
  onUpload: (files: File[]) => void;
}

const Uploader: React.FC<UploaderProps> = ({ onUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);

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
      className="w-full p-4 border-2 border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center space-y-2 hover:border-blue-500/50 transition-all group cursor-pointer bg-slate-950/40 hover:bg-slate-900/40"
      onClick={() => inputRef.current?.click()}
    >
      <input type="file" multiple hidden ref={inputRef} accept="image/*" onChange={handleChange} />
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-slate-800 rounded-lg group-hover:bg-blue-600/20 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Upload Pages</span>
          <span className="text-[8px] text-slate-600 mt-1 uppercase">Images Only (A-Z)</span>
        </div>
      </div>
    </div>
  );
};

export default Uploader;