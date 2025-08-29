import React from 'react';
import { motion } from 'framer-motion';
import { Clock, DollarSign } from 'lucide-react';

const ServiceList = ({ services, onServiceSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {services.map((service) => (
        <motion.button
          key={service.id}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onServiceSelect(service)}
          className="p-4 border rounded-lg text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
        >
          <h4 className="font-medium text-gray-900">{service.name}</h4>
          <p className="text-sm text-gray-600 mt-1">{service.category}</p>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>{service.duration_min} min</span>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium">
              <DollarSign className="h-4 w-4" />
              <span>€{service.price}</span>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
};

export default ServiceList;