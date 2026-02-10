
import React, { useRef } from 'react';

interface UploaderProps {
  onUpload: (files: File[]) => void;
}

const Uploader: React.FC<UploaderProps> = ({ onUpload }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Fix: Explicitly cast to File[] as Array.from on FileList can sometimes result in unknown[] depending on TypeScript configuration
    const files = (Array.from(e.dataTransfer.files) as File[]).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onUpload(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onUpload(Array.from(e.target.files));
    }
  };

  return (
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="max-w-xl w-full p-12 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center space-y-4 hover:border-blue-500 transition-colors group cursor-pointer bg-slate-900/50"
      onClick={() => inputRef.current?.click()}
    >
      <input 
        type="file" 
        multiple 
        hidden 
        ref={inputRef} 
        accept="image/*" 
        onChange={handleChange}
      />
      <div className="p-4 bg-slate-800 rounded-full group-hover:scale-110 transition-transform">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-400 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-200">Upload Comic Pages</h2>
        <p className="text-slate-500 mt-1">Drag and drop images here, or click to browse</p>
      </div>
      <p className="text-xs text-slate-600 mt-4">Supports JPEG, PNG, WEBP (A-Z sorting applied)</p>
    </div>
  );
};

export default Uploader;
