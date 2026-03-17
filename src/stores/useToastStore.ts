import { create } from 'zustand';

interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface ToastState {
    toasts: Toast[];
    show: (message: string, type?: 'success' | 'error' | 'info') => void;
    remove: (id: number) => void;
}

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    show: (message, type = 'info') => {
        const id = Date.now() + Math.random();
        set((state) => ({
            toasts: [...state.toasts, { id, message, type }]
        }));
        setTimeout(() => {
            set((state) => ({
                toasts: state.toasts.filter((t) => t.id !== id)
            }));
        }, 5000);
    },
    remove: (id) => set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
    }))
}));
