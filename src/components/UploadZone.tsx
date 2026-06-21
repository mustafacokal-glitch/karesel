import { useCallback, useRef, useState } from 'react';
import useProjectStore from '../stores/useProjectStore';
import { calculateGridDimensions } from '../utils/gridDimensions';
import { FileValidationError } from '../errors/KareselErrors';
import { useTranslation } from 'react-i18next';

const UploadZone = () => {
  const { t } = useTranslation();
  const setUploadedImage = useProjectStore((s) => s.setUploadedImage);
  const setImageAspectRatio = useProjectStore((s) => s.setImageAspectRatio);
  const setGridDimensions = useProjectStore((s) => s.setGridDimensions);
  const setOrientation = useProjectStore((s) => s.setOrientation);
  const difficultyLevel = useProjectStore((s) => s.difficultyLevel);
  const setError = useProjectStore((s) => s.setError);

  const uploadedImage = useProjectStore((s) => s.uploadedImage);
  const inputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      if (!file) return;
      
      if (!file.type.startsWith('image/')) {
        setError(new FileValidationError('Lütfen geçerli bir görsel dosyası (JPG, PNG, WEBP) seçin.'));
        return;
      }

      // Dosya boyutu kontrolü (10MB)
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) {
        setError(new FileValidationError('Yüklenen dosya boyutu 10MB\'tan büyük olamaz. Lütfen daha küçük bir dosya seçin.'));
        return;
      }
      if (file.size === 0) {
        setError(new FileValidationError('Bu dosya boş görünüyor. Lütfen geçerli bir görsel seçin.'));
        return;
      }

      setError(null);

      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string | null;
        if (!dataUrl) return;
        setUploadedImage(dataUrl);

        // Görsel boyutlarını alarak en boy oranını ve grid boyutlarını hesapla
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          if (img.width === 0 || img.height === 0) {
            setError(new FileValidationError('Görsel boyutları okunamadı. Dosya bozuk olabilir.'));
            return;
          }

          const ratio = img.width / img.height;
          setImageAspectRatio(ratio);

          const { rows, cols } = calculateGridDimensions(difficultyLevel, ratio);

          setGridDimensions({ rows, cols });
          setOrientation('portrait');

          // Eski görsele ait önbelleği ve grid verilerini temizle
          const store = useProjectStore.getState();
          store.setOriginalImageData(null);
          store.setPixelGrid(null);
          store.setSolutionGrid(null);
          store.setColorMap({});
        };
        img.onerror = () => {
          setError(new FileValidationError('Görsel tarayıcı tarafından yorumlanamadı. Dosya formatı bozuk olabilir.'));
        };
      };

      reader.onerror = () => {
        console.error('[UploadZone] FileReader hatası');
        setError(new FileValidationError('Dosya diskten okunurken bir hata oluştu. Lütfen görseli tekrar yüklemeyi deneyin.'));
      };

      reader.readAsDataURL(file);
    },
    [setUploadedImage, setImageAspectRatio, setGridDimensions, setOrientation, difficultyLevel, setError]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => setIsDragOver(false);

  const onClick = () => {
    if (inputRef.current) {
      (inputRef.current as HTMLInputElement).click();
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={uploadedImage ? t('upload.changeImage') : t('upload.uploadImage')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center border-4 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-200 min-h-[200px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-500 ${
        isDragOver
          ? 'border-purple-500 bg-purple-50 scale-[1.02]'
          : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50/50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {uploadedImage ? (
        <div className="flex flex-col items-center gap-3">
          <img
            src={uploadedImage}
            alt=""
            className="max-h-40 rounded-xl shadow-md object-contain"
          />
          <p className="text-sm text-gray-600 font-medium">
            {t('upload.success')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-lg font-semibold text-gray-700">
            {t('upload.title')}
          </p>
          <p className="text-sm text-gray-600">{t('upload.subtitle')}</p>
        </div>
      )}
    </div>
  );
};

export default UploadZone;