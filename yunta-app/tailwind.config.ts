
// Tailwind CSS v4 Configuration
// Note: In v4, most theme configuration happens directly in CSS.
// This file is kept for compatibility or specific JS-based configs if needed,
// but for now, it can be minimal or empty if everything is in CSS.

import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {},
    },
    plugins: [],
};
export default config;
