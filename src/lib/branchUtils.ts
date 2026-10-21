export interface BranchPhoneEntry {
  label?: string;
  number: string;
}

export interface BranchItem {
  id?: string;
  name: string;
  name_ar?: string;
  name_en?: string;
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
  is_main?: boolean;
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
    name_ar: b.name_ar ? String(b.name_ar).trim() : name,
    name_en: b.name_en ? String(b.name_en).trim() : name,
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
    is_main: Boolean(b.is_main),
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
    return b.name_ar || b.name || b.name_en || '';
  }
  return b.name_en || b.name || b.name_ar || '';
}

/**
 * Returns the full list of branches including the Main Branch ("الفرع الرئيسي")
 * when configured in basic restaurant settings and the branch system is active.
 */
export function getAllBranchesWithMain(
  restaurant: {
    address?: string;
    phone?: string;
    phone_numbers?: any[];
    whatsapp_number?: string;
    map_link?: string;
    branches_enabled?: boolean;
    branches?: any[];
    name?: string;
  } | null | undefined,
  isAr: boolean = true
): BranchItem[] {
  if (!restaurant) return [];

  const rawBranches = normalizeBranches(restaurant.branches);
  const branchesEnabled = restaurant.branches_enabled ?? (rawBranches.length > 0);

  // If branches system is explicitly disabled and there are no extra branches, return empty
  if (!branchesEnabled && rawBranches.length === 0) {
    return [];
  }

  // Check if any existing branch already represents the main branch
  const hasMain = rawBranches.some(b => {
    const n = (b.name || '').toLowerCase();
    return n.includes('الرئيسي') || n.includes('الرئيسى') || n.includes('main') || b.is_main;
  });

  const mainAddress = (restaurant.address || '').trim();
  const mainPhone = (restaurant.phone || (Array.isArray(restaurant.phone_numbers) && restaurant.phone_numbers[0]?.number) || '').trim();
  const hasMainData = Boolean(mainAddress || mainPhone);

  // If already has a main branch, return rawBranches
  if (hasMain) {
    return rawBranches;
  }

  // If main restaurant data exists:
  if (hasMainData) {
    const mainBranchName = isAr ? 'الفرع الرئيسي' : 'Main Branch';
    const mainBranch: BranchItem = {
      id: 'main-branch',
      name: mainBranchName,
      name_ar: 'الفرع الرئيسي',
      name_en: 'Main Branch',
      address: mainAddress,
      phone: mainPhone,
      phone_numbers: Array.isArray(restaurant.phone_numbers) && restaurant.phone_numbers.length > 0
        ? restaurant.phone_numbers
        : (mainPhone ? [{ label: '', number: mainPhone }] : []),
      whatsapp_number: restaurant.whatsapp_number ? String(restaurant.whatsapp_number).trim() : '',
      map_link: restaurant.map_link ? String(restaurant.map_link).trim() : '',
      is_main: true,
    };

    if (rawBranches.length > 0) {
      return [mainBranch, ...rawBranches];
    }

    if (branchesEnabled) {
      return [mainBranch];
    }
  }

  return rawBranches;
}
