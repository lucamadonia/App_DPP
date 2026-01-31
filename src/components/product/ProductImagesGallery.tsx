import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Trash2, Star, Loader2, GripVertical, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProductImage } from '@/types/database';
import {
  uploadProductImages,
  deleteProductImage,
  setPrimaryImage,
  updateImageCaption,
} from '@/services/supabase';

interface Props {
  productId: string;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
  readOnly?: boolean;
}

export function ProductImagesGallery({ productId, images, onImagesChange, readOnly }: Props) {
  const { t } = useTranslation('products');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);

  const handleUpload = async (files: FileList) => {
    setIsUploading(true);
    const newImages = await uploadProductImages(Array.from(files), productId);
    onImagesChange([...images, ...newImages]);
    setIsUploading(false);
  };

  const handleDelete = async (imageId: string) => {
    await deleteProductImage(imageId);
    onImagesChange(images.filter(img => img.id !== imageId));
  };

  const handleSetPrimary = async (imageId: string) => {
    await setPrimaryImage(imageId, productId);
    onImagesChange(images.map(img => ({
      ...img,
      isPrimary: img.id === imageId,
    })));
  };

  const handleCaptionSave = async (imageId: string, caption: string) => {
    await updateImageCaption(imageId, caption);
    onImagesChange(images.map(img =>
      img.id === imageId ? { ...img, caption } : img
    ));
    setEditingCaption(null);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            {t('Product Images')}
          </CardTitle>
          {!readOnly && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {t('Upload Images')}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div
            className={`flex h-48 items-center justify-center rounded-lg border-2 border-dashed ${
              readOnly ? '' : 'cursor-pointer hover:bg-muted/50'
            }`}
            onClick={() => !readOnly && fileInputRef.current?.click()}
          >
            <div className="text-center">
              <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {readOnly ? t('No images available') : t('Click or drag images to upload')}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative rounded-lg border overflow-hidden"
              >
                <img
                  src={image.url}
                  alt={image.caption || ''}
                  className="aspect-square w-full object-cover"
                />

                {/* Overlay controls */}
                {!readOnly && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => handleSetPrimary(image.id)}
                      title={t('Set as Primary')}
                    >
                      <Star className={`h-4 w-4 ${image.isPrimary ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      onClick={() => handleDelete(image.id)}
                      title={t('Delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8 cursor-grab"
                      title={t('Drag to reorder')}
                    >
                      <GripVertical className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Primary badge */}
                {image.isPrimary && (
                  <div className="absolute top-2 left-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-medium text-white">
                      <Star className="h-3 w-3 fill-white" />
                      {t('Primary')}
                    </span>
                  </div>
                )}

                {/* Caption */}
                <div className="p-2">
                  {editingCaption === image.id ? (
                    <Input
                      defaultValue={image.caption || ''}
                      placeholder={t('Add Caption')}
                      className="h-7 text-xs"
                      autoFocus
                      onBlur={(e) => handleCaptionSave(image.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCaptionSave(image.id, (e.target as HTMLInputElement).value);
                        }
                      }}
                    />
                  ) : (
                    <p
                      className={`text-xs truncate ${
                        image.caption ? 'text-foreground' : 'text-muted-foreground'
                      } ${!readOnly ? 'cursor-pointer hover:text-primary' : ''}`}
                      onClick={() => !readOnly && setEditingCaption(image.id)}
                    >
                      {image.caption || (readOnly ? '' : t('Add Caption'))}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
