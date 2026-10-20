export interface BranchItem {
  id?: string;
  name: string;
  address?: string;
  map_link?: string;
  phone?: string;
  phone_secondary?: string;
  whatsapp_number?: string;
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  snapchat_url?: string;
}

export function normalizeBranch(b: any): BranchItem {
  if (!b) return { name: '' };
  if (typeof b === 'string') {
    return {
      name: b.trim(),
      address: '',
      map_link: '',
      phone: '',
      phone_secondary: '',
      whatsapp_number: '',
      facebook_url: '',
      instagram_url: '',
      tiktok_url: '',
      snapchat_url: '',
    };
  }
  const name = String(b.name || b.name_ar || b.name_en || '').trim();
  return {
    id: b.id ? String(b.id) : undefined,
    name,
    address: b.address ? String(b.address).trim() : '',
    map_link: String(b.map_link || b.location_url || b.location_link || '').trim(),
    phone: b.phone ? String(b.phone).trim() : '',
    phone_secondary: b.phone_secondary ? String(b.phone_secondary).trim() : '',
    whatsapp_number: b.whatsapp_number ? String(b.whatsapp_number).trim() : '',
    facebook_url: b.facebook_url ? String(b.facebook_url).trim() : '',
    instagram_url: b.instagram_url ? String(b.instagram_url).trim() : '',
    tiktok_url: b.tiktok_url ? String(b.tiktok_url).trim() : '',
    snapchat_url: b.snapchat_url ? String(b.snapchat_url).trim() : '',
  };
}

export function normalizeBranches(branches: any): BranchItem[] {
  if (!Array.isArray(branches)) return [];
  return branches
    .map(normalizeBranch)
    .filter(b => typeof b.name === 'string' && b.name.trim().length > 0);
}

export function getBranchName(b: any, isAr: boolean = true): string {
  if (!b) return '';
  if (typeof b === 'string') return b;
  if (isAr) {
    return b.name || b.name_ar || b.name_en || '';
  }
  return b.name_en || b.name || b.name_ar || '';
}
