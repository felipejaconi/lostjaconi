import { create } from 'zustand';

interface LotFilterState {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedLots: string[];
  toggleLotSelection: (id: string) => void;
  clearSelection: () => void;
}

export const useLotStore = create<LotFilterState>((set) => ({
  searchTerm: '',
  setSearchTerm: (term) => set({ searchTerm: term }),
  selectedLots: [],
  toggleLotSelection: (id) => set((state) => ({
    selectedLots: state.selectedLots.includes(id) 
      ? state.selectedLots.filter(l => l !== id)
      : [...state.selectedLots, id]
  })),
  clearSelection: () => set({ selectedLots: [] }),
}));
