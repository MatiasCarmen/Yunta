// src/app/dashboard/meetings/create/page.tsx
import MeetingEditor from '@/components/meetings/MeetingEditor';

// Metadata para esta página
export const metadata = {
    title: 'YUNTA - Nueva Junta',
    description: 'Crear nueva acta de junta directiva',
};

export default function CreateMeetingPage() {
    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Nueva Junta Directiva</h1>
                <div className="flex items-center text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                    <span className="mr-2">🔌</span>
                    <p>
                        Modo <strong>Offline-First</strong> activo. Puedes redactar el acta sin internet;
                        se guardará en tu dispositivo y se sincronizará cuando recuperes la conexión.
                    </p>
                </div>
            </div>

            <MeetingEditor />
        </div>
    );
}
