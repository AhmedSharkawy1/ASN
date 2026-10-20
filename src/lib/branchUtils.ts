export interface BranchPhoneEntry {
  label?: string;
  number: string;
}

export interface BranchItem {
  id?: string;
  name: string;
  address?: string;
  map_link?: string;
  phone?: string;
  phone_secondary?: string;
  phone_numbers?: BranchPhoneEntry[];
  whatsapp_number?: string;
  facebook_url?: string;
  instagram_url?: string;
  tiktok_url?: string;
  snapchat_url?: string;
}

export function normalizeBranch(b: any): BranchItem {
  if (!b) return { name: '', phone_numbers: [] };
  if (typeof b === 'string') {
    return {
      name: b.trim(),
      address: '',
      map_link: '',
      phone: '',
      phone_secondary: '',
      phone_numbers: [],
      whatsapp_number: '',
      facebook_url: '',
      instagram_url: '',
      tiktok_url: '',
      snapchat_url: '',
    };
  }
  const name = String(b.name || b.name_ar || b.name_en || '').trim();

  // Normalize phone numbers array
  const phoneNumbers: BranchPhoneEntry[] = [];
  if (Array.isArray(b.phone_numbers) && b.phone_numbers.length > 0) {
    b.phone_numbers.forEach((p: any) => {
      if (typeof p === 'object' && p?.number) {
        phoneNumbers.push({
          label: p.label ? String(p.label).trim() : '',
          number: String(p.number).trim(),
        });
      } else if (typeof p === 'string' && p.trim()) {
        phoneNumbers.push({
          label: '',
          number: p.trim(),
        });
      }
    });
  } else {
    if (b.phone && String(b.phone).trim()) {
      phoneNumbers.push({ label: '', number: String(b.phone).trim() });
    }
    if (b.phone_secondary && String(b.phone_secondary).trim()) {
      phoneNumbers.push({ label: '', number: String(b.phone_secondary).trim() });
    }
  }

  const primaryPhone = phoneNumbers[0]?.number || (b.phone ? String(b.phone).trim() : '');
  const secondaryPhone = phoneNumbers[1]?.number || (b.phone_secondary ? String(b.phone_secondary).trim() : '');

  return {
    id: b.id ? String(b.id) : undefined,
    name,
    address: b.address ? String(b.address).trim() : '',
    map_link: String(b.map_link || b.location_url || b.location_link || '').trim(),
    phone: primaryPhone,
    phone_secondary: secondaryPhone,
    phone_numbers: phoneNumbers,
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
