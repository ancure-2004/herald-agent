import {
  Sparkles,
  Shield,
  HeartPulse,
  Smile,
  Activity,
  Microscope,
  Stethoscope,
  Scissors,
  Layers,
  LucideIcon,
} from 'lucide-react';

export function getServiceIcon(category?: string, id?: string, title?: string): LucideIcon {
  const text = `${category || ''} ${id || ''} ${title || ''}`.toLowerCase();
  if (text.includes('cosmetic') || text.includes('veneer') || text.includes('aesthetic') || text.includes('aligner')) {
    return Sparkles;
  }
  if (text.includes('rct') || text.includes('root canal') || text.includes('endodontic')) {
    return HeartPulse;
  }
  if (text.includes('denture') || text.includes('smile') || text.includes('prostho')) {
    return Smile;
  }
  if (text.includes('surgery') || text.includes('extraction') || text.includes('wisdom')) {
    return Scissors;
  }
  if (text.includes('crown') || text.includes('bridge') || text.includes('fpd') || text.includes('zirconia')) {
    return Layers;
  }
  if (text.includes('clean') || text.includes('prevent') || text.includes('hygiene') || text.includes('pediatric')) {
    return Shield;
  }
  if (text.includes('micro') || text.includes('precision') || text.includes('digital') || text.includes('diagnostic')) {
    return Microscope;
  }
  if (text.includes('pain') || text.includes('comfort') || text.includes('gentle')) {
    return Activity;
  }
  return Stethoscope;
}
