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
            colorPrimary: '#4f46e5',
            borderRadius: 12,
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            colorBgContainer: themeMode === 'dark' ? '#0f172a' : '#ffffff',
            colorBgElevated: themeMode === 'dark' ? '#1e293b' : '#ffffff',
            colorText: themeMode === 'dark' ? '#f8fafc' : '#0f172a',
            colorTextSecondary: themeMode === 'dark' ? '#94a3b8' : '#64748b',
          },
          components: {
            Button: {
              borderRadius: 10,
              fontWeight: 600,
            },
            Card: {
              borderRadiusLG: 16,
            },
          },
        }}
      >
        <div className={themeMode === 'dark' ? 'dark bg-slate-950 text-slate-100 min-h-screen' : 'bg-slate-50 text-slate-900 min-h-screen'}>
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
