import { useState, useCallback } from 'react';

interface HistoryState<T> {
    past: T[];
    present: T;
    future: T[];
}

export interface Undoable<T> {
    state: T;
    setState: (newState: T) => void;
    setWithHistory: (newState: T) => void;
    saveSnapshot: () => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    reset: (state: T) => void;
}

export function useUndo<T>(initialState: T, maxHistory = 50): Undoable<T> {
    const [history, setHistory] = useState<HistoryState<T>>({
        past: [],
        present: initialState,
        future: []
    });

    // We use a ref to track if we should debounce the next commit
    // But for simplicity, we'll let the consumer decide when to 'commit' a new history entry
    // vs just updating the current state (e.g. while typing).
    // Actually, handling typing correctly requires either:
    // 1. Debouncing history pushes.
    // 2. Committing on blur or pause.

    // Strategy: 
    // - standard setState updates 'present' but doesn't push to 'past' immediately if it's a rapid sequence?
    // - Let's use a simple approach first: 
    //   If 'commit' is true, we push to past.
    //   If 'commit' is false (default for simple updates?), we replace present.
    // Wait, typical undo hooks push to past on every change. 
    // Improved Strategy:
    // setState(val) -> updates present. 
    // Internal debounce to push to past?

    // Let's refine useUndo to be standard.
    // And use a debounced wrapper in App.

    // Revised useUndo:
    // set(val) -> immediate update, NO history push.
    // save() -> pushes current 'present' to 'past'. 
    // setAndSave(val) -> pushes current 'present' to 'past', then sets 'present' to val.

    const set = useCallback((val: T) => {
        setHistory(curr => ({ ...curr, present: val }));
    }, []);

    const saveSnapshot = useCallback(() => {
        setHistory(curr => {
            const newPast = [...curr.past, curr.present];
            if (newPast.length > maxHistory) newPast.shift();
            return { ...curr, past: newPast }; // present stays same
        });
    }, [maxHistory]);

    // Combine: "I am about to change state significantly"
    const setWithHistory = useCallback((val: T) => {
        setHistory(curr => {
            const newPast = [...curr.past, curr.present];
            if (newPast.length > maxHistory) newPast.shift();
            return {
                past: newPast,
                present: val,
                future: []
            };
        });
    }, [maxHistory]);

    const undo = useCallback(() => {
        setHistory(curr => {
            if (curr.past.length === 0) return curr;
            const previous = curr.past[curr.past.length - 1];
            const newPast = curr.past.slice(0, curr.past.length - 1);
            return {
                past: newPast,
                present: previous,
                future: [curr.present, ...curr.future]
            };
        });
    }, []);

    const redo = useCallback(() => {
        setHistory(curr => {
            if (curr.future.length === 0) return curr;
            const next = curr.future[0];
            const newFuture = curr.future.slice(1);
            return {
                past: [...curr.past, curr.present],
                present: next,
                future: newFuture
            };
        });
    }, []);

    const reset = useCallback((state: T) => {
        setHistory({ past: [], present: state, future: [] });
    }, []);

    return {
        state: history.present,
        setState: set, // Low level, no history
        setWithHistory, // High level, pushes history
        saveSnapshot, // Manual checkoint (e.g. before typing burst)
        undo,
        redo,
        canUndo: history.past.length > 0,
        canRedo: history.future.length > 0,
        reset
    };
}
