/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // Deshabilitar PWA temporalmente para compatibilidad con Turbopack
    // TODO: Migrar a @ducanh2912/next-pwa o implementar Service Worker manualmente
};

module.exports = nextConfig;
