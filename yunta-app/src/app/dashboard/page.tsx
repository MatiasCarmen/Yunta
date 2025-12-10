// ============================================
// YUNTA - Dashboard Page (Temporal)
// ============================================
// Página placeholder post-login
// ============================================

export default function DashboardPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-3xl shadow-2xl p-12 text-center">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">
                        ¡Bienvenido a YUNTA!
                    </h1>
                    <p className="text-xl text-gray-600 mb-8">
                        Dashboard en construcción ️
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                        <div className="p-6 bg-blue-50 rounded-xl">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">
                                Transacciones
                            </h3>
                            <p className="text-gray-600">
                                Próximamente
                            </p>
                        </div>

                        <div className="p-6 bg-green-50 rounded-xl">
                            <h3 className="text-lg font-semibold text-green-900 mb-2">
                                Juntas
                            </h3>
                            <p className="text-gray-600">
                                Próximamente
                            </p>
                        </div>

                        <div className="p-6 bg-purple-50 rounded-xl">
                            <h3 className="text-lg font-semibold text-purple-900 mb-2">
                                Reportes
                            </h3>
                            <p className="text-gray-600">
                                Próximamente
                            </p>
                        </div>
                    </div>

                    <a
                        href="/"
                        className="inline-block mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Cerrar Sesión (volver)
                    </a>
                </div>
            </div>
        </div>
    );
}

export const metadata = {
    title: 'YUNTA - Dashboard',
    description: 'Panel principal de YUNTA',
};
