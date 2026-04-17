/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Download, 
  Type, 
  Image as ImageIcon, 
  Settings, 
  Plus, 
  Trash2, 
  Move,
  Layout,
  Layers,
  Palette,
  ChevronRight,
  ChevronLeft,
  GripVertical,
  Bookmark,
  Sparkles,
  Save
} from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { toPng, toBlob } from 'html-to-image';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { cn } from './lib/utils';

// --- Types ---

interface TextElement {
  id: string;
  text: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  x: number;
  y: number;
  fontWeight: string;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number;
  highlightWords: string[];
  highlightColor: string;
}

interface TextStylePreset {
  id: string;
  name: string;
  fontSize: number;
  color: string;
  fontFamily: string;
  fontWeight: string;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing: number;
  highlightColor: string;
}

interface BgTransform {
  scale: number;
  x: number;
  y: number;
}

interface CustomFont {
  name: string;
  url: string;
}

// --- Main App ---

export default function App() {
  // --- Persistent States ---
  const [bgImage, setBgImage] = useState<string | null>(() => localStorage.getItem('news_pro_bg') || null);
  const [frameImage, setFrameImage] = useState<string | null>(() => localStorage.getItem('news_pro_frame') || null);
  const [bgTransform, setBgTransform] = useState<BgTransform>(() => {
    const saved = localStorage.getItem('news_pro_bg_transform');
    return saved ? JSON.parse(saved) : { scale: 1, x: 0, y: 0 };
  });
  const [elements, setElements] = useState<TextElement[]>(() => {
    const saved = localStorage.getItem('news_pro_elements');
    return saved ? JSON.parse(saved) : [];
  });
  const [fonts, setFonts] = useState<CustomFont[]>(() => {
    const saved = localStorage.getItem('news_pro_fonts');
    return saved ? JSON.parse(saved) : [];
  });
  const [stylePresets, setStylePresets] = useState<TextStylePreset[]>(() => {
    const saved = localStorage.getItem('news_pro_presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [activePresetId, setActivePresetId] = useState<string | null>(localStorage.getItem('news_pro_active_preset'));

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bg' | 'frame' | 'text' | 'fonts'>('bg');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [canvasScale, setCanvasScale] = useState(0.8);

  const previewRef = useRef<HTMLDivElement>(null);

  // --- Persistence Side Effects ---
  useEffect(() => {
    try {
      if (bgImage) {
        // Only save if it's reasonably small (localStorage is ~5MB total)
        if (bgImage.length < 2000000) { 
          localStorage.setItem('news_pro_bg', bgImage);
        } else {
          console.warn('Background image too large for persistence. It will be lost on refresh.');
        }
      } else {
        localStorage.removeItem('news_pro_bg');
      }
    } catch (e) {
      console.error('Storage error for bgImage:', e);
    }
  }, [bgImage]);

  useEffect(() => {
    try {
      if (frameImage) {
        if (frameImage.length < 2000000) {
          localStorage.setItem('news_pro_frame', frameImage);
        } else {
          console.warn('Frame image too large for persistence. It will be lost on refresh.');
        }
      } else {
        localStorage.removeItem('news_pro_frame');
      }
    } catch (e) {
      console.error('Storage error for frameImage:', e);
    }
  }, [frameImage]);

  useEffect(() => {
    try {
      localStorage.setItem('news_pro_bg_transform', JSON.stringify(bgTransform));
    } catch (e) { console.error(e); }
  }, [bgTransform]);

  useEffect(() => {
    try {
      localStorage.setItem('news_pro_elements', JSON.stringify(elements));
    } catch (e) { console.error(e); }
  }, [elements]);

  useEffect(() => {
    try {
      localStorage.setItem('news_pro_fonts', JSON.stringify(fonts));
      // Re-inject custom fonts header on load
      fonts.forEach(font => {
        if (!document.getElementById(`font-${font.name}`)) {
          const style = document.createElement('style');
          style.id = `font-${font.name}`;
          style.textContent = `@font-face { font-family: '${font.name}'; src: url('${font.url}'); }`;
          document.head.appendChild(style);
        }
      });
    } catch (e) { console.error(e); }
  }, [fonts]);

  useEffect(() => {
    try {
      localStorage.setItem('news_pro_presets', JSON.stringify(stylePresets));
    } catch (e) { console.error(e); }
  }, [stylePresets]);

  useEffect(() => {
    try {
      if (activePresetId) localStorage.setItem('news_pro_active_preset', activePresetId);
      else localStorage.removeItem('news_pro_active_preset');
    } catch (e) { console.error(e); }
  }, [activePresetId]);

  const handleExport = async () => {
    if (!previewRef.current || isExporting) return;
    setIsExporting(true);
    
    // Toast notification or loader feedback
    const originalText = "Exporting...";
    
    try {
      // Small Delay for font sync
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 1500));

      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#000000',
        width: 800,
        height: 800
      });

      // Direct download link method is most compatible
      const link = document.createElement('a');
      link.setAttribute('download', `news-pro-${Date.now()}.png`);
      link.setAttribute('href', dataUrl);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error('Export error:', err);
      try {
        const dataUrl = await toPng(previewRef.current, { cacheBust: true, pixelRatio: 1 });
        // Fallback: Open in new window if download link fails
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`<img src="${dataUrl}" style="max-width:100%;">`);
          newWindow.document.title = "Save Image (Right Click)";
        } else {
          alert('ডাউনলোড বন্ধ আছে। দয়াকরে প্রিভিউ ইমেজের ওপর রাইট ক্লিক করে "Save Image As" সিলেক্ট করুন।');
        }
      } catch (innerErr) {
        alert('এক্সপোর্ট করতে সমস্যা হচ্ছে। দয়াকরে অ্যাপটি সরাসরি নতুন ট্যাবে ওপেন করে ট্রাই করুন।');
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setter(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const fontName = file.name.split('.')[0].replace(/\s+/g, '-');
          const fontUrl = event.target.result as string;
          
          const newFont = { name: fontName, url: fontUrl };
          setFonts(prev => [...prev, newFont]);

          const style = document.createElement('style');
          style.textContent = `
            @font-face {
              font-family: '${fontName}';
              src: url('${fontUrl}');
            }
          `;
          document.head.appendChild(style);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const addTextElement = () => {
    const activePreset = stylePresets.find(p => p.id === activePresetId);
    
    const newElement: TextElement = {
      id: Math.random().toString(36).substr(2, 9),
      text: 'নতুন টেক্সট',
      fontSize: activePreset?.fontSize || 48,
      color: activePreset?.color || '#ffffff',
      fontFamily: activePreset?.fontFamily || (fonts.length > 0 ? fonts[0].name : 'Inter'),
      x: 100,
      y: 400,
      fontWeight: activePreset?.fontWeight || '700',
      textAlign: activePreset?.textAlign || 'center',
      letterSpacing: activePreset?.letterSpacing || 0,
      highlightWords: [],
      highlightColor: activePreset?.highlightColor || '#f97316',
    };
    setElements(prev => [...prev, newElement]);
    setSelectedId(newElement.id);
  };

  const saveCurrentStyleAsPreset = () => {
    if (!selectedElement) return;
    const name = prompt('প্রিসেট এর একটি নাম দিন (যেমন: Headings, Details):');
    if (!name) return;

    const newPreset: TextStylePreset = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      fontSize: selectedElement.fontSize,
      color: selectedElement.color,
      fontFamily: selectedElement.fontFamily,
      fontWeight: selectedElement.fontWeight,
      textAlign: selectedElement.textAlign,
      letterSpacing: selectedElement.letterSpacing,
      highlightColor: selectedElement.highlightColor,
    };

    setStylePresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
    alert('স্টাইল প্রিসেট হিসেবে সেভ করা হয়েছে!');
  };

  const applyPreset = (preset: TextStylePreset) => {
    if (!selectedId) return;
    updateElement(selectedId, {
      fontSize: preset.fontSize,
      color: preset.color,
      fontFamily: preset.fontFamily,
      fontWeight: preset.fontWeight,
      textAlign: preset.textAlign,
      letterSpacing: preset.letterSpacing,
      highlightColor: preset.highlightColor,
    });
    setActivePresetId(preset.id);
  };

  const removePreset = (id: string) => {
    setStylePresets(prev => prev.filter(p => p.id !== id));
    if (activePresetId === id) setActivePresetId(null);
  };

  const updateElement = (id: string, updates: Partial<TextElement>) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const removeElement = (id: string) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 400 : 0 }}
        className="relative h-full bg-[#111] border-r border-white/10 flex flex-col z-20"
      >
        <div className={cn("flex flex-col h-full", !sidebarOpen && "hidden")}>
          <div className="p-6 border-bottom border-white/10 flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-orange-500">NEWS PRO</h1>
            <div className="flex gap-2">
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                title="Collapse sidebar"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-white/10 px-2">
            {[
              { id: 'bg', icon: ImageIcon, label: 'BG' },
              { id: 'frame', icon: Layout, label: 'Frame' },
              { id: 'text', icon: Type, label: 'Text' },
              { id: 'fonts', icon: Palette, label: 'Fonts' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex-1 py-4 flex flex-col items-center gap-1 transition-all border-b-2 font-medium text-xs tracking-widest uppercase",
                  activeTab === tab.id 
                    ? "border-orange-500 text-orange-500 bg-orange-500/5" 
                    : "border-transparent text-white/50 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Background Settings */}
            {activeTab === 'bg' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">Background Layer</h3>
                <div className="group relative border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-orange-500/50 transition-all cursor-pointer">
                  <input 
                    type="file" 
                    onChange={(e) => handleImageUpload(e, setBgImage)} 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept="image/*"
                  />
                  <Upload className="mx-auto mb-3 text-white/20 group-hover:text-orange-500 transition-colors" size={32} />
                  <p className="text-sm text-white/60">Upload Background Image</p>
                </div>
                
                {bgImage && (
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-orange-500 uppercase">Resizing & Position</h4>
                      <button 
                         onClick={() => setBgTransform({ scale: 1, x: 0, y: 0 })}
                         className="text-[10px] text-white/30 hover:text-white uppercase"
                      >
                        Reset
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/40 block">Scale ({bgTransform.scale.toFixed(2)}x)</label>
                      <input 
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.01"
                        value={bgTransform.scale}
                        onChange={(e) => setBgTransform(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                        className="w-full accent-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 block">X Offset</label>
                        <input 
                          type="range"
                          min="-500"
                          max="500"
                          value={bgTransform.x}
                          onChange={(e) => setBgTransform(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                          className="w-full accent-zinc-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 block">Y Offset</label>
                        <input 
                          type="range"
                          min="-500"
                          max="500"
                          value={bgTransform.y}
                          onChange={(e) => setBgTransform(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                          className="w-full accent-zinc-500"
                        />
                      </div>
                    </div>

                    <button 
                      onClick={() => setBgImage(null)}
                      className="w-full py-2 text-xs uppercase tracking-tighter text-red-500/50 hover:text-red-500 transition-colors border border-red-500/20 rounded-lg mt-4"
                    >
                      Clear Background Image
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Frame Settings */}
            {activeTab === 'frame' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">Overlay Frame</h3>
                <div className="group relative border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-orange-500/50 transition-all cursor-pointer">
                  <input 
                    type="file" 
                    onChange={(e) => handleImageUpload(e, setFrameImage)} 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept="image/*"
                  />
                  <Layout className="mx-auto mb-3 text-white/20 group-hover:text-orange-500 transition-colors" size={32} />
                  <p className="text-sm text-white/60">Upload Transparent Frame</p>
                </div>
                {frameImage && (
                  <button 
                    onClick={() => setFrameImage(null)}
                    className="w-full py-2 text-xs uppercase tracking-tighter text-red-500/50 hover:text-red-500 transition-colors"
                  >
                    Clear Frame
                  </button>
                )}
              </div>
            )}

            {/* Text Settings */}
            {activeTab === 'text' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">Text Elements</h3>
                  <button 
                    onClick={addTextElement}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  >
                    <Plus size={14} /> Add Text
                  </button>
                </div>

                <div className="space-y-2">
                  {elements.map((el) => (
                    <div 
                      key={el.id}
                      onClick={() => setSelectedId(el.id)}
                      className={cn(
                        "p-3 rounded-lg flex items-center justify-between border cursor-pointer transition-all",
                        selectedId === el.id ? "bg-orange-500/10 border-orange-500/50" : "bg-white/5 border-transparent hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Type size={16} className={selectedId === el.id ? "text-orange-500" : "text-white/40"} />
                        <span className="truncate text-sm font-medium">{el.text || 'Empty Text'}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                        className="p-1.5 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {selectedElement && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6 pt-6 border-t border-white/10"
                  >
                    {/* Style Presets Section */}
                    <div className="bg-orange-500/5 rounded-3xl p-5 border border-orange-500/10 space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <div className="p-1.5 bg-orange-500/20 rounded-lg">
                                <Bookmark size={12} className="text-orange-500" />
                             </div>
                             <span className="text-[10px] uppercase font-black text-orange-500 tracking-[0.15em]">Style Library</span>
                          </div>
                          {selectedElement && (
                             <button 
                                onClick={saveCurrentStyleAsPreset}
                                className="text-[10px] bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-full font-black tracking-wider shadow-lg shadow-orange-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                             >
                                <Save size={10} /> Capture
                             </button>
                          )}
                       </div>

                       {stylePresets.length > 0 ? (
                         <div className="grid grid-cols-2 gap-2">
                            {stylePresets.map(preset => (
                               <div key={preset.id} className="relative group">
                                  <button 
                                     onClick={() => applyPreset(preset)}
                                     className={cn(
                                        "w-full px-3 py-2.5 rounded-xl text-[10px] font-bold border text-left transition-all duration-300 truncate pr-8",
                                        activePresetId === preset.id 
                                          ? "bg-orange-500 border-orange-500 text-white shadow-xl shadow-orange-500/10" 
                                          : "bg-black/20 border-white/5 text-white/50 hover:border-orange-500/30 hover:text-white"
                                     )}
                                  >
                                     {preset.name}
                                  </button>
                                  <button 
                                     onClick={() => removePreset(preset.id)}
                                     className="absolute top-1/2 -translate-y-1/2 right-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200"
                                  >
                                     <Trash2 size={10} />
                                  </button>
                               </div>
                            ))}
                         </div>
                       ) : (
                         <div className="py-4 text-center border border-dashed border-white/10 rounded-2xl">
                           <p className="text-[10px] text-white/20 italic font-medium">No presets saved yet</p>
                         </div>
                       )}
                    </div>

                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-orange-500 uppercase tracking-[0.2em]">Appearance</h4>
                      <button 
                        onClick={() => removeElement(selectedElement.id)}
                        className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                        title="Delete Element"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Group: Text Content */}
                    <div className="bg-white/5 rounded-2xl p-4 space-y-4 border border-white/5">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 block tracking-widest">Text Content</label>
                        <textarea 
                          value={selectedElement.text}
                          onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500 transition-colors min-h-[100px] leading-relaxed"
                          placeholder="আপনার টেক্সট এখানে লিখুন..."
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 block tracking-widest">Highlight Words (Comma separated)</label>
                        <input 
                          type="text"
                          placeholder="e.g. বিশ্বকাপ, জয়"
                          value={selectedElement.highlightWords.join(', ')}
                          onChange={(e) => {
                            const words = e.target.value.split(',').map(w => w.trim()).filter(w => w !== '');
                            updateElement(selectedElement.id, { highlightWords: words });
                          }}
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    {/* Group: Position & Size */}
                    <div className="bg-white/5 rounded-2xl p-4 space-y-4 border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                         <span className="text-[10px] uppercase font-black text-white/30 tracking-widest">Layout & Geometry</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-2">
                           <label className="text-[10px] uppercase font-bold text-white/40 block">Font Size</label>
                           <input 
                             type="number"
                             value={selectedElement.fontSize}
                             onChange={(e) => updateElement(selectedElement.id, { fontSize: parseInt(e.target.value) })}
                             className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm"
                           />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] uppercase font-bold text-white/40 block">X Position</label>
                           <input 
                             type="number"
                             value={Math.round(selectedElement.x)}
                             onChange={(e) => updateElement(selectedElement.id, { x: parseInt(e.target.value) })}
                             className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm font-mono"
                           />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] uppercase font-bold text-white/40 block">Y Position</label>
                           <input 
                             type="number"
                             value={Math.round(selectedElement.y)}
                             onChange={(e) => updateElement(selectedElement.id, { y: parseInt(e.target.value) })}
                             className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm font-mono"
                           />
                         </div>
                         <div className="space-y-2">
                           <label className="text-[10px] uppercase font-bold text-white/40 block text-center">Tracking</label>
                           <input 
                              type="number"
                              value={selectedElement.letterSpacing}
                              onChange={(e) => updateElement(selectedElement.id, { letterSpacing: parseInt(e.target.value) })}
                              className="w-full bg-black/20 border border-white/10 rounded-lg p-2.5 text-sm text-center"
                           />
                         </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 block">Alignment</label>
                        <div className="flex gap-1 p-1 bg-black/20 rounded-xl">
                          {(['left', 'center', 'right'] as const).map(align => (
                            <button
                              key={align}
                              onClick={() => updateElement(selectedElement.id, { textAlign: align })}
                              className={cn(
                                "flex-1 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all",
                                selectedElement.textAlign === align ? "bg-orange-500 text-white shadow-lg" : "text-white/40 hover:text-white"
                              )}
                            >
                              {align.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Group: Font & Style */}
                    <div className="bg-white/5 rounded-2xl p-4 space-y-4 border border-white/5">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 block tracking-widest">Font Family</label>
                        <select 
                          value={selectedElement.fontFamily}
                          onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                          className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500 appearance-none cursor-pointer"
                        >
                          <option value="Inter">Inter (Default)</option>
                          <option value="Anek Bangla">Anek Bangla (NEW)</option>
                          <option value="Hind Siliguri">Hind Siliguri</option>
                          <optgroup label="Uploaded Fonts">
                            {fonts.map(f => (
                              <option key={f.name} value={f.name}>{f.name}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] uppercase font-bold text-white/40 block tracking-widest">Font Weight</label>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { label: 'Light', val: '300' },
                            { label: 'Regular', val: '400' },
                            { label: 'Bold', val: '700' },
                          ].map(w => (
                            <button 
                               key={w.val}
                               onClick={() => updateElement(selectedElement.id, { fontWeight: w.val })}
                               className={cn(
                                 "py-2 text-[10px] rounded-lg transition-all font-bold",
                                 selectedElement.fontWeight === w.val ? "bg-white text-black" : "bg-black/20 text-white/40 hover:text-white"
                               )}
                            >
                              {w.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Group: Colors */}
                    <div className="bg-white/5 rounded-2xl p-4 space-y-6 border border-white/5">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] uppercase font-black text-white/40 block text-center tracking-widest">Text Color</label>
                          <HexColorPicker 
                            color={selectedElement.color} 
                            onChange={(color) => updateElement(selectedElement.id, { color })} 
                            className="!w-full !h-24 miniature-picker"
                          />
                          <HexColorInput 
                            color={selectedElement.color} 
                            onChange={(color) => updateElement(selectedElement.id, { color })} 
                            className="bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] font-mono uppercase w-full text-center outline-none focus:border-orange-500"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] uppercase font-black text-white/40 block text-center tracking-widest">Highlight</label>
                          <HexColorPicker 
                            color={selectedElement.highlightColor} 
                            onChange={(color) => updateElement(selectedElement.id, { highlightColor: color })} 
                            className="!w-full !h-24 miniature-picker"
                          />
                          <HexColorInput 
                            color={selectedElement.highlightColor} 
                            onChange={(color) => updateElement(selectedElement.id, { highlightColor: color })} 
                            className="bg-black/40 border border-white/10 rounded-lg p-2 text-[10px] font-mono uppercase w-full text-center outline-none focus:border-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Font Management */}
            {activeTab === 'fonts' && (
              <div className="space-y-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/40">Custom Fonts</h3>
                <div className="group relative border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-orange-500/50 transition-all cursor-pointer">
                  <input 
                    type="file" 
                    onChange={handleFontUpload} 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".ttf,.otf,.woff,.woff2"
                  />
                  <Palette className="mx-auto mb-3 text-white/20 group-hover:text-orange-500 transition-colors" size={32} />
                  <p className="text-sm text-white/60">Upload Font File</p>
                  <p className="text-[10px] text-white/30 mt-1">TTF, OTF supported</p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] uppercase font-bold text-white/40">Active Fonts</h4>
                  {fonts.length === 0 && <p className="text-xs text-white/20 italic">No custom fonts uploaded</p>}
                  {fonts.map((f) => (
                    <div key={f.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-sm font-medium" style={{ fontFamily: f.name }}>{f.name}</span>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/40 uppercase">Custom</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 opacity-50">
                    <span className="text-sm font-medium">Inter</span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/40 uppercase">System</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          <div className="p-6 border-t border-white/10 flex flex-col gap-3">
             <button 
                onClick={handleExport}
                disabled={isExporting}
                className={cn(
                  "w-full bg-white text-[#0a0a0a] font-black uppercase text-sm py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed",
                  !isExporting ? "hover:bg-orange-500 hover:text-white" : "cursor-wait"
                )}
             >
               {isExporting ? (
                 <>
                   <div className="w-4 h-4 border-2 border-zinc-500 border-t-zinc-900 animate-spin rounded-full"></div>
                   Exporting...
                 </>
               ) : (
                 <>
                   <Download size={18} /> Export Image
                 </>
               )}
             </button>
             <p className="text-center text-[10px] text-white/20 font-medium tracking-widest uppercase">
               News Template Creator v1.0
             </p>
             <div className="bg-orange-500/5 border border-orange-500/10 p-3 rounded-xl mt-2">
               <p className="text-[10px] text-orange-500/60 leading-relaxed text-center">
                 ডাউনলোড না হলে অ্যাপটি নতুন ট্যাবে ওপেন করুন অথবা ছবির ওপর রাইট ক্লিক করে সেভ করুন।
               </p>
             </div>
          </div>
        </div>

        {/* Expand Sidebar Trigger */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-6 -right-12 p-3 bg-orange-500 text-white rounded-r-xl shadow-lg border-y border-r border-white/20 hover:bg-orange-600 transition-all z-30"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </motion.aside>

      {/* Main Preview Area */}
      <main className="flex-1 relative flex flex-col items-center justify-center p-8 bg-grid-pattern overflow-auto">
        <div className="mb-6 flex items-center gap-4 bg-black/40 px-4 py-2 rounded-full border border-white/5 backdrop-blur-md">
           <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Canvas Zoom</span>
           <input 
              type="range"
              min="0.2"
              max="1.5"
              step="0.05"
              value={canvasScale}
              onChange={(e) => setCanvasScale(parseFloat(e.target.value))}
              className="w-32 accent-orange-500"
           />
           <span className="text-[10px] font-mono text-orange-500 w-12">{Math.round(canvasScale * 100)}%</span>
           <button 
             onClick={() => setCanvasScale(1)}
             className="p-1 hover:bg-white/10 rounded transition-colors"
           >
              <Move size={14} className="text-white/40" />
           </button>
        </div>

        <div 
          className="relative shrink-0"
          style={{ 
            transform: `scale(${canvasScale})`,
            transformOrigin: 'center center'
          }}
        >
          {/* Export Overlay (Outside ref to prevent capture) */}
          <AnimatePresence>
            {isExporting && (
              <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none rounded-[4px]"
              >
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ImageIcon size={48} className="text-orange-500 mb-4" />
                  </motion.div>
                  <p className="text-orange-500 font-black tracking-[0.4em] uppercase text-xs">Processing Card...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div 
            className="relative bg-black shadow-[0_32px_120px_-20px_rgba(0,0,0,0.8)] overflow-hidden aspect-square border-8 border-white/[0.03] transition-all duration-700"
            style={{ 
              width: '800px', 
              height: '800px',
              borderRadius: isExporting ? '0' : '4px' 
            }}
            ref={previewRef}
          >
            {/* Layer 1: Background Image */}
            <div className="absolute inset-0 z-0 overflow-hidden">
              {bgImage ? (
                <img 
                  src={bgImage} 
                  alt="Background" 
                  className="w-full h-full object-cover origin-center"
                  style={{ 
                    transform: `translate(${bgTransform.x}px, ${bgTransform.y}px) scale(${bgTransform.scale})` 
                  }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center opacity-30">
                  <ImageIcon size={64} className="text-white/10" />
                </div>
              )}
            </div>

            {/* Layer 2: Frame Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              {frameImage && (
                <img 
                  src={frameImage} 
                  alt="Frame" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>

            {/* Layer 3: Interactive Text Elements */}
            <div className="absolute inset-0 z-20 overflow-hidden">
              {elements.map((el) => (
                <DraggableText 
                  key={el.id} 
                  el={el} 
                  isSelected={selectedId === el.id} 
                  isExporting={isExporting}
                  onSelect={() => setSelectedId(el.id)}
                  onUpdate={(updates) => updateElement(el.id, updates)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Guidelines / Branding for Preview - Moved outside previewRef to avoid export */}
        <div className="absolute top-4 left-4 z-40 px-2 py-1 bg-black/50 text-[10px] font-mono tracking-tighter opacity-50 rounded pointer-events-none">
          800 x 800 PREVIEW
        </div>

        {/* Canvas Instructions */}
        <div className="fixed bottom-8 right-8 text-right space-y-2 pointer-events-none opacity-40">
          <p className="text-xs font-bold uppercase tracking-widest flex items-center justify-end gap-2">
            <Move size={14} /> Drag text to position
          </p>
          <p className="text-[10px] font-medium uppercase tracking-widest">
            Select layers from the sidebar to edit
          </p>
        </div>
      </main>

      {/* Global Overrides */}
      <style>{`
        .bg-grid-pattern {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
        }
        .miniature-picker .react-colorful__saturation {
          border-radius: 8px 8px 0 0;
        }
        .miniature-picker .react-colorful__hue {
          height: 8px;
          border-radius: 0 0 8px 8px;
        }
      `}</style>
    </div>
  );
}

// --- Sub-components ---

interface DraggableTextProps {
  key?: React.Key;
  el: TextElement;
  isSelected: boolean;
  isExporting: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TextElement>) => void;
}

function DraggableText({ el, isSelected, isExporting, onSelect, onUpdate }: DraggableTextProps) {
  const dragControls = useDragControls();

  // Highlighting logic
  let displayedContent: React.ReactNode = el.text;
  if (el.highlightWords.length > 0) {
    const pattern = new RegExp(`(${el.highlightWords.join('|')})`, 'gi');
    const parts = el.text.split(pattern);
    displayedContent = parts.map((part, i) => {
      const isHighlight = el.highlightWords.some(w => w.toLowerCase() === part.toLowerCase());
      return isHighlight ? (
        <span key={i} style={{ color: el.highlightColor }}>{part}</span>
      ) : (
        part
      );
    });
  }

  return (
    <motion.div
      drag
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        onUpdate({ 
          x: el.x + info.offset.x, 
          y: el.y + info.offset.y 
        });
      }}
      className={cn(
        "absolute select-none z-30 group",
        (isSelected && !isExporting) && "ring-2 ring-blue-500 ring-offset-2 ring-offset-black/20 rounded-lg p-2 bg-blue-500/5 shadow-2xl scale-[1.02] transition-all"
      )}
      style={{ 
        left: el.x, 
        top: el.y, 
        color: el.color,
        fontSize: `${el.fontSize}px`,
        fontFamily: el.fontFamily,
        fontWeight: el.fontWeight,
        textAlign: el.textAlign,
        letterSpacing: `${el.letterSpacing}px`,
        maxWidth: '100%',
        lineHeight: '1.2'
      }}
      onPointerDown={onSelect}
    >
      {/* Drag Handle */}
      {isSelected && !isExporting && (
        <div 
          onPointerDown={(e) => dragControls.start(e)}
          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-500 text-white p-1.5 rounded-full shadow-lg cursor-grab active:cursor-grabbing hover:scale-110 transition-transform flex items-center gap-1.5 px-3 whitespace-nowrap"
        >
          <GripVertical size={14} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Move Element</span>
        </div>
      )}

      <div style={{ whiteSpace: 'pre-wrap' }}>
        {displayedContent}
      </div>
    </motion.div>
  );
}
