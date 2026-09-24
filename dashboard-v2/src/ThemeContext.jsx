import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    // Check local storage or default to light mode
    const saved = localStorage.getItem('vacbot-theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Update data attribute on body
    if (isDark) {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('vacbot-theme', 'dark');
    } else {
      document.body.removeAttribute('data-theme');
      localStorage.setItem('vacbot-theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
