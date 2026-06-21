import React, { useState, useRef } from 'react';
import useProjectStore from '../stores/useProjectStore';
import { PALETTE } from '../engine/color/colorDistance';

export default function ColorLegend() {
  const colorMap = useProjectStore((s) => s.colorMap);
  const isEditMode = useProjectStore((s) => s.isEditMode);
  const selectedColorId = useProjectStore((s) => s.selectedColorId);
  const setSelectedColorId = useProjectStore((s) => s.setSelectedColorId);
  const changeColorMapping = useProjectStore((s) => s.changeColorMapping);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeColorId, setActiveColorId] = useState<number | null>(null);

  const longPressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const colorEntries = Object.entries(colorMap);

  const handleStart = (id: string | number) => {
    isLongPress.current = false;
    if (!isEditMode) return;
    longPressTimeout.current = setTimeout(() => {
      isLongPress.current = true;
      setActiveColorId(Number(id));
      setIsModalOpen(true);
    }, 600);
  };

  const handleEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
    }
  };

  const handleColorClick = (id: string | number) => {
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    if (isEditMode) {
      setSelectedColorId(Number(id));
    } else {
      setActiveColorId(Number(id));
      setIsModalOpen(true);
    }
  };

  const handleContextMenu = (e: React.MouseEvent | React.TouchEvent, id: string | number) => {
    e.preventDefault();
    if (isEditMode) {
      setActiveColorId(Number(id));
      setIsModalOpen(true);
    }
  };

  const handleSelectNewColor = (newColor: any) => {
    if (activeColorId !== null) {
      changeColorMapping(activeColorId, newColor);
      if (isEditMode) {
        setSelectedColorId(activeColorId);
      }
    }
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">🎨 Renk Tablosu</h3>

      {colorEntries.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          Henüz renk paleti oluşturulmadı. Önce bir görsel yükleyin.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {/* Silgi Butonu (yalnızca düzenleme modunda) */}
          {isEditMode && (
            <button
              onClick={() => setSelectedColorId(0)}
              className={`flex flex-col items-center justify-center rounded-xl p-2 border-2 transition-all min-h-[84px] ${
                selectedColorId === 0
                  ? 'border-red-500 bg-red-50 shadow-md'
                  : 'border-gray-200 hover:border-red-300 hover:bg-red-50'
              }`}
              title="Silgi"
            >
              <span className="text-2xl mb-1">🧹</span>
              <span className="text-xs font-bold text-gray-600 mt-0.5 text-center">
                Silgi
              </span>
            </button>
          )}

          {colorEntries.map(([id, color]) => (
            <button
              key={id}
              onMouseDown={() => handleStart(id)}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={() => handleStart(id)}
              onTouchEnd={handleEnd}
              onTouchMove={handleEnd}
              onContextMenu={(e) => handleContextMenu(e, id)}
              onClick={() => handleColorClick(id)}
              className={`flex flex-col items-center justify-center rounded-xl p-2 border-2 transition-all min-h-[84px] cursor-pointer hover:border-blue-300 select-none ${
                selectedColorId === Number(id)
                  ? 'border-blue-500 shadow-md scale-105'
                  : 'border-gray-200'
              }`}
              title={
                isEditMode
                  ? `${id} — ${color?.name || id} (Boyamak için tıklayın, değiştirmek için sağ tıklayın veya basılı tutun)`
                  : `${id} — ${color?.name || id}`
              }
            >
              <div
                className="w-7 h-7 rounded-lg border border-gray-300 flex-shrink-0"
                style={{ backgroundColor: color?.hex || '#ffffff' }}
              />
              <span className="text-[10px] font-extrabold text-gray-700 mt-1 leading-none">
                {id}
              </span>
              <span
                className="text-xs font-bold text-gray-600 mt-1 leading-tight text-center w-full overflow-hidden"
                style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
              >
                {color?.name || ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {isEditMode && (
        <p className="text-xs text-blue-500 font-medium">
          ✏️ Düzenleme modu aktif &mdash; Boyamak için tıkla, rengi değiştirmek için sağ tıkla veya basılı tut.
        </p>
      )}

      {/* Renk Değiştirme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-zoom-in">
            {/* Modal Başlığı */}
            <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 p-5 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold text-lg">🎨 Renk Değiştir</h4>
                <p className="text-xs opacity-90 mt-0.5">
                  Mevcut renk: <span className="font-bold underline">{activeColorId !== null ? colorMap[activeColorId]?.name : `Renk ${activeColorId}`}</span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:text-gray-200 text-2xl font-semibold leading-none focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Renk Seçenekleri (24 Kuru Boya) */}
            <div className="p-6 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-3 bg-gray-50">
              {PALETTE.map((color) => {
                const isCurrent = activeColorId !== null && colorMap[activeColorId]?.hex === color.hex;
                return (
                  <button
                    key={color.id}
                    onClick={() => handleSelectNewColor(color)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl bg-white border-2 transition-all hover:scale-105 hover:shadow-md ${
                      isCurrent
                        ? 'border-purple-600 ring-2 ring-purple-100'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg border border-gray-300 flex-shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />
                    <span className="text-[10px] font-bold text-gray-700 mt-1.5 leading-none text-center">
                      {color.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Modal Alt Kısmı */}
            <div className="p-4 border-t border-gray-100 flex justify-end bg-white">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}