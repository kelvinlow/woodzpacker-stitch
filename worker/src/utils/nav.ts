/**
 * Single source of truth for nav items: public/nav.json
 * Edit that file — both the worker and layout.js consume it.
 *
 * workerHref: overrides href for server-rendered pages (worker context).
 */

import rawNavItems from '../../../public/nav.json';

export type NavItem = {
  label: string;
  href: string;
  workerHref: string | null;
  activeMatch: 'includes' | 'exact';
  activeKey: string;
};

export const NAV_ITEMS: NavItem[] = rawNavItems as NavItem[];
