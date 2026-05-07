import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_PREFIX } from '@/lib/constants';

export interface SavedView {
  id: string;
  name: string;
  tableId: string;
  filters: Record<string, unknown>;
  sorting?: { id: string; desc: boolean }[];
  columnVisibility?: Record<string, boolean>;
}

interface SavedViewsState {
  views: SavedView[];
  addView: (view: Omit<SavedView, 'id'>) => void;
  removeView: (id: string) => void;
  updateView: (id: string, updates: Partial<SavedView>) => void;
}

export const useSavedViewsStore = create<SavedViewsState>()(
  persist(
    (set) => ({
      views: [],
      addView: (view) =>
        set((state) => ({
          views: [...state.views, { ...view, id: crypto.randomUUID() }],
        })),
      removeView: (id) =>
        set((state) => ({ views: state.views.filter((v) => v.id !== id) })),
      updateView: (id, updates) =>
        set((state) => ({
          views: state.views.map((v) => (v.id === id ? { ...v, ...updates } : v)),
        })),
    }),
    { name: `${STORAGE_PREFIX}saved-views` }
  )
);
