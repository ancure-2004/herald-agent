import fs from 'fs';
import path from 'path';

export interface ImageManifestItem {
  fileName: string;
  path: string;
  depicts: string;
  alt: string;
  isStock: boolean;
  depictsServices?: string[];
}

export interface ImageManifest {
  clinicSlug: string;
  images: ImageManifestItem[];
}

export function getClinicImageManifest(slug: string): ImageManifest | null {
  try {
    const manifestPath = path.join(process.cwd(), 'public', 'clinics', slug, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw) as ImageManifest;
  } catch {
    return null;
  }
}

/**
 * Returns image path and honest alt text for a service.
 * First checks if an image specifically depicts this service.
 * If not, falls back to relevant clinical dental gallery images so demos look vibrant and complete.
 */
export function getServiceDepictingImage(
  slug: string,
  service: { id: string; image?: string; title?: string; category?: string }
): { src: string; alt: string } | null {
  const manifest = getClinicImageManifest(slug);
  const images = manifest?.images && manifest.images.length > 0 ? manifest.images : null;

  // Available fallback gallery images in public/images
  const defaultGallery = [
    { src: '/images/hero-clinic.jpg', alt: 'Modern dental examination room and operatory' },
    { src: '/images/operatory-room.jpg', alt: 'Digital intraoral diagnostic examination and consultation' },
    { src: '/images/root-canal-tech.jpg', alt: 'Precision rotary endodontic treatment equipment' },
    { src: '/images/pediatric-care.jpg', alt: 'Gentle patient dental examination and planning' },
    { src: '/images/smile-transformation.jpg', alt: 'Aesthetic restorative care and smile transformation' },
    { src: '/images/sterilization.jpg', alt: 'Autoclave sterilization equipment and sealed clinical pouches' },
  ];

  if (images) {
    const resolveExistingPath = (imgItem: ImageManifestItem) => {
      // Check if image exists in clinic directory
      const localDiskPath = path.join(process.cwd(), 'public', imgItem.path.replace(/^\//, ''));
      if (fs.existsSync(localDiskPath)) {
        return { src: imgItem.path, alt: imgItem.alt };
      }
      // If not yet copied to clinic folder, use shared gallery in public/images
      const sharedPath = `/images/${imgItem.fileName}`;
      const sharedDiskPath = path.join(process.cwd(), 'public', 'images', imgItem.fileName);
      if (fs.existsSync(sharedDiskPath)) {
        return { src: sharedPath, alt: imgItem.alt };
      }
      return null;
    };

    // 1. Exact service ID match in manifest
    const matched = images.find(
      (img) =>
        img.depictsServices &&
        img.depictsServices.includes(service.id) &&
        (!service.image || service.image.endsWith(img.fileName) || service.image === img.path)
    );
    if (matched) {
      const resolved = resolveExistingPath(matched);
      if (resolved) return resolved;
    }

    // 2. Keyword matching on service title / id / category against manifest images
    const text = `${service.id} ${service.title || ''} ${service.category || ''}`.toLowerCase();
    
    let matchedImg = null;
    if (text.includes('root') || text.includes('rct') || text.includes('endodontic') || text.includes('filling') || text.includes('cavity')) {
      matchedImg = images.find((i) => i.fileName.includes('root-canal') || i.fileName.includes('operatory'));
    } else if (text.includes('smile') || text.includes('aligner') || text.includes('cosmetic') || text.includes('veneer') || text.includes('whitening')) {
      matchedImg = images.find((i) => i.fileName.includes('smile-transformation'));
    } else if (text.includes('pediatric') || text.includes('kid') || text.includes('child')) {
      matchedImg = images.find((i) => i.fileName.includes('pediatric-care'));
    } else if (text.includes('steril') || text.includes('clean') || text.includes('scaling') || text.includes('hygiene')) {
      matchedImg = images.find((i) => i.fileName.includes('sterilization') || i.fileName.includes('operatory'));
    } else if (text.includes('checkup') || text.includes('consultation') || text.includes('exam')) {
      matchedImg = images.find((i) => i.fileName.includes('operatory-room') || i.fileName.includes('hero-clinic'));
    }

    if (matchedImg) {
      const resolved = resolveExistingPath(matchedImg);
      if (resolved) return resolved;
    }
  }

  // 3. Fallback to default gallery images based on service characteristics
  const text = `${service.id} ${service.title || ''} ${service.category || ''}`.toLowerCase();
  if (text.includes('root') || text.includes('rct') || text.includes('filling') || text.includes('cavity')) {
    return defaultGallery[2]; // root-canal-tech.jpg
  }
  if (text.includes('smile') || text.includes('aligner') || text.includes('veneer') || text.includes('cosmetic')) {
    return defaultGallery[4]; // smile-transformation.jpg
  }
  if (text.includes('clean') || text.includes('scaling') || text.includes('hygiene') || text.includes('steril')) {
    return defaultGallery[5]; // sterilization.jpg
  }
  if (text.includes('pediatric') || text.includes('child') || text.includes('preventive')) {
    return defaultGallery[3]; // pediatric-care.jpg
  }
  if (text.includes('checkup') || text.includes('consultation') || text.includes('exam')) {
    return defaultGallery[1]; // operatory-room.jpg
  }

  // Deterministic fallback based on service id character code
  const charCode = (service.id || 'service').charCodeAt(0);
  const fallback = defaultGallery[charCode % defaultGallery.length];
  return fallback;
}
