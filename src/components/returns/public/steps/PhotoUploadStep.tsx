import { useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS = 5;

interface PhotoUploadStepProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
}

export function PhotoUploadStep({ photos, onPhotosChange }: PhotoUploadStepProps) {
  const { t } = useTranslation('returns');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const addFiles = useCallback((files: FileList | File[]) => {
    setError('');
    const newFiles: File[] = [];

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(t('Maximum file size is 10MB'));
        continue;
      }
      if (file.type.startsWith('image/')) {
        newFiles.push(file);
      }
    }

    const combined = [...photos, ...newFiles].slice(0, MAX_PHOTOS);
    onPhotosChange(combined);
  }, [photos, onPhotosChange, t]);

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">{t('Photos')}</h2>
        <p className="text-sm text-muted-foreground">{t('Please upload photos of the item(s)')}</p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {t('{{current}} of {{max}} photos', { current: photos.length, max: MAX_PHOTOS })}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: MAX_PHOTOS }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i < photos.length ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : photos.length >= MAX_PHOTOS
            ? 'border-gray-200 opacity-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => photos.length < MAX_PHOTOS && fileInputRef.current?.click()}
      >
        <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm font-medium">{t('Drag photos here or click to browse')}</p>
        <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP &middot; {t('Max 10MB per file')}</p>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((file, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border animate-scale-in">
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="w-full h-28 object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
              >
                <X className="h-3 w-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                <p className="text-[10px] text-white truncate">{file.name}</p>
                <p className="text-[10px] text-white/70">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
