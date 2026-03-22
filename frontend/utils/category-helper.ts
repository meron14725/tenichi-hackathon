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
