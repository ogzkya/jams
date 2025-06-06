import React, { createContext, useState, useMemo, useContext } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';

// Tema konteksti oluştur
const ThemeContext = createContext();

// Tema sağlayıcı component
export const ThemeProvider = ({ children }) => {
  // Yerel depolamadan kaydedilmiş tema tercihini al (ilk yükleme için)
  const storedDarkMode = localStorage.getItem('darkMode') === 'true';
  
  // Dark mode state'i
  const [darkMode, setDarkMode] = useState(storedDarkMode);

  // Dark mode değiştirme fonksiyonu
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    // Tema tercihini local storage'a kaydet
    localStorage.setItem('darkMode', newDarkMode.toString());
  };

  // Tema oluşturma
  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode: darkMode ? 'dark' : 'light',
        primary: {
          main: '#6366F1',
        },
        secondary: {
          main: '#EC4899',
        },
        background: {
          default: darkMode ? '#121212' : '#F9FAFB',
          paper: darkMode ? '#1E1E1E' : '#FFFFFF',
        },
      },
      typography: {
        fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
        h1: {
          fontWeight: 600,
        },
        h2: {
          fontWeight: 600,
        },
        h3: {
          fontWeight: 600,
        },
        h4: {
          fontWeight: 600,
        },
        h5: {
          fontWeight: 600,
        },
        h6: {
          fontWeight: 600,
        },
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 500,
            },
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
              boxShadow: darkMode 
                ? '0px 4px 20px rgba(0, 0, 0, 0.4)' 
                : '0px 4px 20px rgba(0, 0, 0, 0.08)',
            },
          },
        },
      },
    });
  }, [darkMode]);

  // Context değeri
  const contextValue = { darkMode, toggleDarkMode };

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Hook oluşturma
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
