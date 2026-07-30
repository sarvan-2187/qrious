import { useState, useEffect, useRef } from 'react';

interface UseAutosaveOptions<T> {
  value: T;
  onSave: (val: T) => Promise<void> | void;
  delayMs?: number;
  enabled?: boolean;
}

export function useAutosave<T>({
  value,
  onSave,
  delayMs = 1000,
  enabled = true
}: UseAutosaveOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const serializedValue = JSON.stringify(value);
  const prevSerializedRef = useRef(serializedValue);
  const latestSaveRef = useRef(onSave);
  latestSaveRef.current = onSave;

  useEffect(() => {
    if (!enabled) return;

    // Do nothing if content hasn't actually changed
    if (serializedValue === prevSerializedRef.current) {
      return;
    }

    setIsSaving(true);
    const timer = setTimeout(async () => {
      try {
        await latestSaveRef.current(value);
        prevSerializedRef.current = serializedValue;
        setLastSavedAt(new Date());
      } catch (err) {
        console.error('Autosave failed:', err);
      } finally {
        setIsSaving(false);
      }
    }, delayMs);

    return () => {
      if (timer) {
        clearTimeout(timer);
        // Flush pending save immediately on unmount/change
        Promise.resolve(latestSaveRef.current(value)).catch(console.error);
      }
    };
  }, [serializedValue, value, delayMs, enabled]);

  return { isSaving, lastSavedAt };
}
