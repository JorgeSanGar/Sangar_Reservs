import React from 'react';
import { useMemo } from 'react';

const CategoryChips = ({ services, selectedCategory, onSelectCategory }) => {
  const categories = useMemo(() => Array.from(new Set(services.map(s => s.category.toLowerCase()))), [services]);

  const categoryDisplayNames = {
    coche: "Coche",
    '4x4': "4x4",
    camion: "Camión",
    tractor: "Tractor",
    industrial: "Industrial"
  };
  
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map(cat => (
        <button 
          key={cat} 
          onClick={() => onSelectCategory(cat)} 
          className={`px-4 py-2 text-sm font-medium rounded-full transition-colors
            ${selectedCategory === cat 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`
          }
        >
          {categoryDisplayNames[cat] || cat}
        </button>
      ))}
    </div>
  );
};

export default CategoryChips;