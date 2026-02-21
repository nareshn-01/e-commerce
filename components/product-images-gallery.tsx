import { useState } from 'react';

interface ProductImage {
  id: number;
  image_url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

interface ProductImagesGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductImagesGallery({ images, productName }: ProductImagesGalleryProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="bg-gray-200 h-96 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">No images available</p>
      </div>
    );
  }

  // Sort images by display order
  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);
  const selectedImage = sortedImages[selectedImageIndex];

  return (
    <div className="space-y-4">
      {/* Main image display */}
      <div className="relative bg-gray-100 rounded-lg overflow-hidden h-96">
        <img
          src={selectedImage.image_url}
          alt={selectedImage.alt_text || productName}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.svg';
          }}
        />
      </div>

      {/* Thumbnail carousel */}
      {sortedImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedImageIndex(index)}
              className={`flex-shrink-0 h-20 w-20 rounded-lg border-2 overflow-hidden transition ${
                selectedImageIndex === index
                  ? 'border-blue-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              aria-label={`View image ${index + 1}: ${image.alt_text || productName}`}
            >
              <img
                src={image.image_url}
                alt={image.alt_text || `${productName} - Image ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Image counter */}
      {sortedImages.length > 1 && (
        <p className="text-sm text-gray-500 text-center">
          Image {selectedImageIndex + 1} of {sortedImages.length}
        </p>
      )}
    </div>
  );
}
