import { motion } from 'framer-motion';

import React from 'react';

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const MetricCard = ({ title, icon, content }: MetricCardProps) => {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="glass-panel p-6 flex flex-col justify-center"
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[13px] font-semibold text-secondary uppercase tracking-wider">{title}</h3>
        <div className="p-2 bg-black/5 dark:bg-white/5 rounded-lg text-primary">
          {icon}
        </div>
      </div>
      {content}
    </motion.div>
  );
};
