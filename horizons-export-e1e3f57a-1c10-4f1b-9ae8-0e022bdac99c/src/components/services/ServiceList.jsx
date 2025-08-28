import React from 'react';

const ServiceList = ({ services, category, onSelectService }) => {
  const filteredServices = services.filter(s => s.category.toLowerCase() === category);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded-lg">
      {filteredServices.map(srv => (
        <div 
          key={srv.id} 
          onClick={() => onSelectService(srv)} 
          className="service-card p-4 rounded-lg cursor-pointer border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 transition-all"
        >
          <h4 className="font-semibold text-gray-800">{srv.name}</h4>
          <p className="text-sm text-gray-600">{srv.duration} min • €{srv.price}</p>
        </div>
      ))}
    </div>
  );
};

export default ServiceList;