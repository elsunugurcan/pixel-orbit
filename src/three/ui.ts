import { create } from "zustand";
/** Yalnızca arayüz için: üzerinde durulan hücre. */
export const useUI = create<{ hoverCell: number | null; setHover: (c: number | null) => void }>((set) => ({ hoverCell: null, setHover: (hoverCell) => set((s) => (s.hoverCell === hoverCell ? s : { hoverCell })) }));
