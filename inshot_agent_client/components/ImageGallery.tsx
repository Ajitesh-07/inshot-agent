'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, GripVertical } from 'lucide-react';
import { UploadedImage } from '@/types/agent';

interface ImageGalleryProps {
    images: UploadedImage[];
    onImagesChange: (images: UploadedImage[]) => void;
}

export function ImageGallery({ images, onImagesChange }: ImageGalleryProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files).filter(
            file => file.type.startsWith('image/')
        );

        if (files.length > 0) {
            const newImages: UploadedImage[] = files.map((file, idx) => ({
                id: `img-${Date.now()}-${idx}`,
                file,
                preview: URL.createObjectURL(file),
                appliedEffects: [],
                appliedAnimations: [],
            }));
            onImagesChange([...images, ...newImages]);
        }
    }, [images, onImagesChange]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            const newImages: UploadedImage[] = files.map((file, idx) => ({
                id: `img-${Date.now()}-${idx}`,
                file,
                preview: URL.createObjectURL(file),
                appliedEffects: [],
                appliedAnimations: [],
            }));
            onImagesChange([...images, ...newImages]);
        }
    }, [images, onImagesChange]);

    const removeImage = useCallback((id: string) => {
        const image = images.find(img => img.id === id);
        if (image) {
            URL.revokeObjectURL(image.preview);
        }
        onImagesChange(images.filter(img => img.id !== id));
    }, [images, onImagesChange]);

    // Cleanup previews on unmount
    useEffect(() => {
        return () => {
            images.forEach(img => URL.revokeObjectURL(img.preview));
        };
    }, []);

    return (
        <div className="space-y-4">
            <label className="block text-sm font-medium text-[#a1a1aa]">
                Images ({images.length})
            </label>

            {/* Upload Zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
          relative flex flex-col items-center justify-center
          w-full p-4 rounded-xl cursor-pointer
          border-2 border-dashed transition-all duration-300
          ${isDragging
                        ? 'border-[#22c55e] bg-[#22c55e]/5 glow-green'
                        : 'border-[#27272a] bg-[#0d0d12] hover:border-[#3f3f46]'
                    }
        `}
            >
                <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileInput}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <Upload className={`w-6 h-6 mb-2 ${isDragging ? 'text-[#22c55e]' : 'text-[#52525b]'}`} />
                <p className="text-sm text-[#71717a]">
                    <span className="text-[#22c55e]">Upload</span> or drag images
                </p>
            </div>

            {/* Image Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    {images.map((image, index) => (
                        <div
                            key={image.id}
                            className="relative group aspect-square rounded-lg overflow-hidden bg-[#111118] border border-[#27272a]"
                        >
                            {/* Image Number Badge */}
                            <div className="absolute top-1.5 left-1.5 z-10 px-2 py-0.5 rounded-full bg-[#0a0a0f]/80 backdrop-blur-sm border border-[#27272a]">
                                <span className="text-xs font-bold text-[#22c55e]">{index + 1}</span>
                            </div>

                            {/* Image */}
                            <img
                                src={image.preview}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />

                            {/* Effects Badge */}
                            {(image.appliedEffects.length > 0 || image.appliedAnimations.length > 0) && (
                                <div className="absolute bottom-1.5 left-1.5 right-1.5 z-10">
                                    <div className="flex flex-wrap gap-1">
                                        {image.appliedEffects.slice(0, 2).map((effect, i) => (
                                            <span key={i} className="px-1.5 py-0.5 text-[10px] rounded bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30">
                                                {effect}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                            {/* Remove Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeImage(image.id);
                                }}
                                className="absolute top-1.5 right-1.5 z-20 p-1 rounded-full bg-[#0a0a0f]/80 text-[#71717a] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[#ef4444] hover:bg-[#ef4444]/20"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {images.length === 0 && (
                <div className="flex flex-col items-center py-8 text-center">
                    <ImageIcon className="w-10 h-10 text-[#27272a] mb-3" />
                    <p className="text-sm text-[#52525b]">No images uploaded yet</p>
                </div>
            )}
        </div>
    );
}
