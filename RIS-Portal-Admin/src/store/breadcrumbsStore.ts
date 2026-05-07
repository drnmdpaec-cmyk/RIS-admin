import { create } from 'zustand';

export interface Breadcrumb {
  label: string;
  href?: string;
}

interface BreadcrumbsState {
  crumbs: Breadcrumb[];
  setCrumbs: (crumbs: Breadcrumb[]) => void;
}

export const useBreadcrumbsStore = create<BreadcrumbsState>((set) => ({
  crumbs: [],
  setCrumbs: (crumbs) => set({ crumbs }),
}));
