import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, theme as antTheme } from 'antd';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem('app_theme') as ThemeMode;
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
  });

  useEffect(() => {
    localStorage.setItem('app_theme', themeMode);
    const root = document.documentElement;
    if (themeMode === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeModeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
  };

  return (
    <ThemeContext.Provider value={{ themeMode, toggleTheme, setThemeMode }}>
      <ConfigProvider
        theme={{
          algorithm: themeMode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#59B335',
            borderRadius: 14,
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            colorBgContainer: themeMode === 'dark' ? '#162218' : '#FFFFFF',
            colorBgElevated: themeMode === 'dark' ? '#1D2E21' : '#FFFFFF',
            colorText: themeMode === 'dark' ? '#F2F9F3' : '#1A291C',
            colorTextSecondary: themeMode === 'dark' ? '#92A895' : '#4E6351',
          },
          components: {
            Button: {
              borderRadius: 12,
              fontWeight: 700,
            },
            Card: {
              borderRadiusLG: 16,
            },
          },
        }}
      >
        <div className={themeMode === 'dark' ? 'dark bg-[#0F1710] text-[#F2F9F3] min-h-screen font-sans' : 'bg-[#FDFBF7] text-[#1A291C] min-h-screen font-sans'}>
          {children}
        </div>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
