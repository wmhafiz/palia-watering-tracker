import React from 'react';
import { Plant } from '../types';

interface PlantComponentProps {
  plant: Plant;
  onToggleWater?: (plantId: string) => void;
}

export const PlantComponent: React.FC<PlantComponentProps> = ({ plant, onToggleWater }) => {
  const getPlantEmoji = (name: string): string => {
    switch (name) {
      case 'Tomato': return '🍅';
      case 'Wheat': return '🌾';
      case 'Rice': return '🌾';
      case 'Potato': return '🥔';
      case 'Carrot': return '🥕';
      case 'Onion': return '🧅';
      case 'Lettuce': return '🥬';
      case 'Cotton': return '🌱';
      case 'Apple': return '🍎';
      case 'Blueberry': return '🫐';
      case 'Bok Choy': return '🥬';
      case 'Napa Cabbage': return '🥬';
      case 'Spicy Pepper': return '🌶️';
      case 'Batterfly Beans': return '🫘';
      case 'Rockhopper Pumpkin': return '🎃';
      case 'Corn': return '🌽';
      default: return '🌱';
    }
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-700/20 rounded-lg">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">{getPlantEmoji(plant.name)}</span>
        <div>
          <div className="font-medium text-gray-300">{plant.name}</div>
          <div className="text-xs text-gray-400">ID: {plant.id}</div>
        </div>
      </div>
      <button
        className={`px-3 py-1 rounded text-xs transition-colors ${
          plant.needsWater 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
        onClick={() => onToggleWater?.(plant.id)}
      >
        {plant.needsWater ? 'Needs Water' : 'Watered'}
      </button>
    </div>
  );
};