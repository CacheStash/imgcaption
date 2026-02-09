
import React from 'react';
import { Page } from '../types';
import { cleanText } from '../utils/helpers';

interface GalleryProps {
  pages: Page[];
  hideLabels: boolean;
  onSelectPage: (id: string) => void;
}

const Gallery: React.FC<GalleryProps> = ({ pages, hideLabels, onSelectPage }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {pages.map((page, index) => (
        <div 
          key={page.id}
          onClick={() => onSelectPage(page.id)}
          className="group relative bg-slate-800 rounded-xl overflow-hidden shadow-xl cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all aspect-[3/4]"
        >
          <img 
            src={page.imageUrl} 
            alt={page.fileName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-80"
          />
          
          <div className="absolute inset-0 p-3 flex flex-col pointer-events-none">
            <div className="flex justify-between items-start">
              <span className="bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-slate-300">
                P.{index + 1}
              </span>
              <span className="bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded text-[10px] font-medium text-slate-300 max-w-[100px] truncate">
                {page.fileName}
              </span>
            </div>

            <div className="mt-auto space-y-1">
              {page.textObjects.slice(0, 3).map((obj) => (
                <div 
                  key={obj.id} 
                  className="bg-white/90 backdrop-blur-sm text-[8px] text-slate-950 p-1 rounded shadow-sm border-l-2 border-blue-500 line-clamp-1"
                >
                  {cleanText(obj.originalText, hideLabels)}
                </div>
              ))}
              {page.textObjects.length > 3 && (
                <div className="text-[8px] text-slate-400 text-center bg-slate-900/40 rounded">
                  + {page.textObjects.length - 3} more
                </div>
              )}
            </div>
          </div>
          
          <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all">
              Edit Page
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Gallery;
