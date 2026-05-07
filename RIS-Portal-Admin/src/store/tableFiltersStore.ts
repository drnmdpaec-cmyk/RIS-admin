import { create } from 'zustand';

type FilterMap = Record<string, unknown>;

interface TableFiltersState {
  filters: Record<string, FilterMap>;
  setFilters: (tableId: string, filters: FilterMap) => void;
  clearFilters: (tableId: string) => void;
}

export const useTableFiltersStore = create<TableFiltersState>((set) => ({
  filters: {},
  setFilters: (tableId, filters) =>
    set((state) => ({ filters: { ...state.filters, [tableId]: filters } })),
  clearFilters: (tableId) =>
    set((state) => {
      const next = { ...state.filters };
      delete next[tableId];
      return { filters: next };
    }),
}));
