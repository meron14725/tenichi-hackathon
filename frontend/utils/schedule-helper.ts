import { AppColors as C } from '@/constants/app-colors';

/**
 * Gets the MaterialCommunityIcons name for a given schedule unit name.
 */
export function getScheduleCategoryIcon(name: string): string {
  if (name.includes('遊')) return 'run-fast';
  if (name.includes('食')) return 'hamburger';
  if (name.includes('仕事')) return 'account-group-outline';
  if (name.includes('帰')) return 'exit-run';
  return 'label-outline';
}

/**
 * Gets the color for a given schedule unit name based on AppColors.
 */
export function getScheduleCategoryColor(name: string): string {
  if (name.includes('遊') || name.includes('旅')) return C.travel;
  if (name.includes('食')) return C.eventWarm;
  if (name.includes('仕事')) return C.work;
  if (name.includes('帰')) return C.eventGreen;
  return C.eventGreen;
}

const scheduleWorkIcon = require('@/assets/images/schedule-work-icon.svg');
const scheduleMealIcon = require('@/assets/images/schedule-meal-icon.svg');
const schedulePlayIcon = require('@/assets/images/schedule-play-icon.svg');
const scheduleHomeIcon = require('@/assets/images/schedule-home-icon.svg');

export function getScheduleTagTheme(tagId: number) {
  switch (tagId) {
    case 1:
      return { icon: scheduleWorkIcon, label: '仕事' };
    case 2:
      return { icon: scheduleMealIcon, label: '食事' };
    case 3:
      return { icon: schedulePlayIcon, label: '遊び' };
    case 5:
      return { icon: scheduleHomeIcon, label: '帰宅' };
    default:
      return { icon: scheduleWorkIcon, label: '仕事' };
  }
}
