'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getNotebook, saveNotebook } from '@/app/actions/notebook';
import { Button } from '@/components/ui/button';
import { BookOpen, X, Loader2, Check } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function NotebookModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<SaveStatus>('idle');
    const [loading, setLoading] = useState(true);
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const contentRef = useRef(content);

    // Keep ref in sync
    contentRef.current = content;

    // Load notebook on open
    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        getNotebook()
            .then((data) => {
                setContent(data.content);
                setLastSaved(data.updatedAt);
                setStatus('idle');
            })
            .catch(() => setStatus('error'))
            .finally(() => setLoading(false));
    }, [isOpen]);

    // Debounced auto-save
    const debouncedSave = useCallback((newContent: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        setStatus('idle');
        debounceRef.current = setTimeout(async () => {
            setStatus('saving');
            const res = await saveNotebook(newContent);
            if (res.success) {
                setStatus('saved');
                if (res.updatedAt) setLastSaved(res.updatedAt);
                // Reset to idle after 2s
                setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000);
            } else {
                setStatus('error');
                setTimeout(() => setStatus('idle'), 3000);
            }
        }, 1500);
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setContent(val);
        debouncedSave(val);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <BookOpen className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Cuaderno</h2>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                {status === 'saving' && (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Guardando…</span>
                                    </>
                                )}
                                {status === 'saved' && (
                                    <>
                                        <Check className="w-3 h-3 text-green-500" />
                                        <span className="text-green-600">Guardado</span>
                                    </>
                                )}
                                {status === 'error' && (
                                    <span className="text-red-500">Error al guardar</span>
                                )}
                                {status === 'idle' && lastSaved && (
                                    <span>
                                        Última edición:{' '}
                                        {new Date(lastSaved).toLocaleString('es-PE', {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 p-4 overflow-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <textarea
                            value={content}
                            onChange={handleChange}
                            placeholder="Escribe tus notas aquí…&#10;&#10;• Recordatorios&#10;• Pendientes&#10;• Observaciones&#10;• Lo que necesites"
                            className="w-full min-h-[60vh] p-4 text-sm text-slate-700 leading-relaxed bg-slate-50/50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all placeholder:text-slate-300"
                            autoFocus
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
