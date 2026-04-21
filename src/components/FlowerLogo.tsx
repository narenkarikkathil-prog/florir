import React from 'react';
import { motion } from 'motion/react';

interface FlowerLogoProps {
  className?: string;
  size?: number;
}

export const FlowerLogo: React.FC<FlowerLogoProps> = ({ className, size = 32 }) => {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial="initial"
      animate="animate"
      whileHover="hover"
    >
      {/* Petals */}
      <motion.circle
        cx="12"
        cy="7"
        r="3"
        fill="currentColor"
        variants={{
          initial: { scale: 0.8, opacity: 0.6 },
          animate: { scale: 1, opacity: 1, transition: { duration: 2, repeat: Infinity, repeatType: "reverse" } },
          hover: { scale: 1.1 }
        }}
      />
      <motion.circle
        cx="17"
        cy="12"
        r="3"
        fill="currentColor"
        variants={{
          initial: { scale: 0.8, opacity: 0.6 },
          animate: { scale: 1, opacity: 1, transition: { duration: 2, delay: 0.5, repeat: Infinity, repeatType: "reverse" } },
          hover: { scale: 1.1 }
        }}
      />
      <motion.circle
        cx="12"
        cy="17"
        r="3"
        fill="currentColor"
        variants={{
          initial: { scale: 0.8, opacity: 0.6 },
          animate: { scale: 1, opacity: 1, transition: { duration: 2, delay: 1, repeat: Infinity, repeatType: "reverse" } },
          hover: { scale: 1.1 }
        }}
      />
      <motion.circle
        cx="7"
        cy="12"
        r="3"
        fill="currentColor"
        variants={{
          initial: { scale: 0.8, opacity: 0.6 },
          animate: { scale: 1, opacity: 1, transition: { duration: 2, delay: 1.5, repeat: Infinity, repeatType: "reverse" } },
          hover: { scale: 1.1 }
        }}
      />
      {/* Center */}
      <circle cx="12" cy="12" r="2.5" fill="#FAF8F4" />
      <circle cx="12" cy="12" r="1.5" fill="#C4976A" />
    </motion.svg>
  );
};

export const BloomingFlower: React.FC<{ className?: string; size?: number; delay?: number }> = ({ className, size = 40, delay = 0 }) => {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, rotate: -20 }}
      animate={{ opacity: 0.15, rotate: 0 }}
      transition={{ duration: 1.5, delay, ease: "easeOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.path 
          d="M12 22V12M12 12C12 12 15 9 18 9C21 9 22 11 22 12C22 13 21 15 18 15C15 15 12 12 12 12ZM12 12C12 12 9 15 6 15C3 15 2 13 2 12C2 11 3 9 6 9C9 9 12 12 12 12ZM12 12C12 12 15 15 15 18C15 21 13 22 12 22C11 22 9 21 9 18C9 15 12 12 12 12ZM12 12C12 12 9 9 9 6C9 3 11 2 12 2C13 2 15 3 15 6C15 9 12 12 12 12Z" 
          stroke="currentColor" 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: delay + 0.5, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
};
