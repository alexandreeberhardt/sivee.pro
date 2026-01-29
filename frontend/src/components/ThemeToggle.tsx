import { Sun, Moon } from 'lucide-react';
import { useTheme, Theme } from '../hooks/useTheme';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const themes: { value: Theme; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="w-5 h-5" />, label: 'Light' },
    { value: 'dark', icon: <Moon className="w-5 h-5" />, label: 'Dark' },
  ];

  return (
    <div className="flex items-center gap-1 bg-primary-200 dark:bg-primary-300 rounded-lg p-1">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          className={`
            p-1.5 rounded-md transition-all duration-200
            ${theme === t.value
              ? 'bg-surface-0 shadow-sm text-primary-900'
              : 'text-primary-500 hover:bg-surface-100 hover:text-primary-700'
            }
          `}
          title={t.label}
          aria-label={`Set theme to ${t.label}`}
        >
          {t.icon}
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;
