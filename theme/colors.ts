export interface Theme {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

export const lightTheme: Theme = {
  primary: '#FF00FF', // Magenta
  secondary: '#F0E68C', // Khaki
  background: '#FFFFFF',
  surface: '#F5F5F5',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
};

export const darkTheme: Theme = {
  primary: '#FF6BFF', // Lighter magenta for dark mode
  secondary: '#FFF68C', // Lighter khaki for dark mode
  background: '#000000',
  surface: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  border: '#333333',
};
