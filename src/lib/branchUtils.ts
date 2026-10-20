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
      name: b,
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
  return {
    id: b.id,
    name: b.name || b.name_ar || b.name_en || '',
    address: b.address || '',
    map_link: b.map_link || b.location_url || b.location_link || '',
    phone: b.phone || '',
    phone_secondary: b.phone_secondary || '',
    whatsapp_number: b.whatsapp_number || '',
    facebook_url: b.facebook_url || '',
    instagram_url: b.instagram_url || '',
    tiktok_url: b.tiktok_url || '',
    snapchat_url: b.snapchat_url || '',
  };
}

export function normalizeBranches(branches: any): BranchItem[] {
  if (!Array.isArray(branches)) return [];
  return branches.map(normalizeBranch).filter(b => b.name && b.name.trim().length > 0);
}

export function getBranchName(b: any, isAr: boolean = true): string {
  if (!b) return '';
  if (typeof b === 'string') return b;
  if (isAr) {
    return b.name || b.name_ar || b.name_en || '';
  }
  return b.name_en || b.name || b.name_ar || '';
}
