import { create } from 'zustand';
import { Plant } from '../types';

interface GardenStore {
  plants: Plant[];
  setPlants: (plants: Plant[]) => void;
  addPlant: (plant: Plant) => void;
  toggleWater: (id: string) => void;
}

export const useGardenStore = create<GardenStore>((set) => ({
  plants: [],
  
  setPlants: (plants: Plant[]) => set({ plants }),
  
  addPlant: (plant: Plant) => set((state) => ({
    plants: [...state.plants, plant]
  })),
  
  toggleWater: (id: string) => set((state) => ({
    plants: state.plants.map(plant =>
      plant.id === id ? { ...plant, needsWater: !plant.needsWater } : plant
    )
  }))
}));