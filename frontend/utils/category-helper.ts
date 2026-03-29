import { AppColors as C } from '@/constants/app-colors';

export type CategoryIconSet = 'ionicons' | 'fa5' | 'mci';

export interface CategoryIconInfo {
  icon: string;
  iconSet: CategoryIconSet;
}

export const CATEGORY_ICON_MAP: Record<string, CategoryIconInfo> = {
  休日: { icon: 'bicycle', iconSet: 'ionicons' },
  旅行: { icon: 'suitcase-rolling', iconSet: 'fa5' },
  仕事: { icon: 'briefcase-outline', iconSet: 'mci' },
  出張: { icon: 'briefcase', iconSet: 'fa5' },
};

export function getCategoryIcon(name: string): CategoryIconInfo {
  return CATEGORY_ICON_MAP[name] || { icon: 'bookmark-outline', iconSet: 'ionicons' };
}

export const CATEGORY_COLORS: Record<number, string> = {
  4: C.holiday,
  5: C.travel,
  6: C.work,
  7: C.business,
};

export function getCategoryColor(id: number): string {
  return CATEGORY_COLORS[id] || C.accent;
}

const workIconSvg = require('@/assets/images/work-icon.svg');
const holidayIconSvg = require('@/assets/images/holiday-icon.svg');
const travelIconSvg = require('@/assets/images/travel-icon.svg');
const businessTripIconSvg = require('@/assets/images/business-trip-icon.svg');

export function getCategoryTheme(categoryId?: number) {
  switch (categoryId) {
    case 4:
      return { icon: holidayIconSvg, color: '#A86A78' };
    case 5:
      return { icon: travelIconSvg, color: '#C2A070' };
    case 7:
      return { icon: businessTripIconSvg, color: '#9284C2' };
    case 6:
    default:
      return { icon: workIconSvg, color: '#8A9E97' };
  }
}
