'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'yunta-theme';

export function useTheme() {
    const [theme, setThemeState] = useState<Theme>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        
        // Read from localStorage
        try {
            const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
            if (stored === 'light' || stored === 'dark') {
                setThemeState(stored);
                applyTheme(stored);
            } else {
                // Default to light
                const defaultTheme: Theme = 'light';
                setThemeState(defaultTheme);
                applyTheme(defaultTheme);
            }
        } catch (error) {
            console.error('Error reading theme from localStorage:', error);
            setThemeState('light');
            applyTheme('light');
        }
    }, []);

    const setTheme = (newTheme: Theme) => {
        try {
            localStorage.setItem(STORAGE_KEY, newTheme);
            setThemeState(newTheme);
            applyTheme(newTheme);
        } catch (error) {
            console.error('Error saving theme to localStorage:', error);
        }
    };

    const toggleTheme = () => {
        const newTheme: Theme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    };

    return { theme, setTheme, toggleTheme, mounted };
}

function applyTheme(theme: Theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
}
