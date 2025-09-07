import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`flex items-center gap-2 text-sm text-gray-800 dark:text-white hover:text-green-600 transition ${className}`}
    >
      {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
      <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
};

export default ThemeToggle;
