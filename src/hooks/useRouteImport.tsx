import { useCallback, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react';
import { useActivityStore } from '@store/activityStore';
import { parseRouteFile, type ImportedRoute } from '@services/routeImport';
import ImportRouteDialog, { ImportErrorDialog } from '@components/ImportRouteDialog';

const ACCEPT =
  '.gpx,.kml,.geojson,.json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/geo+json,application/json';

export interface ImportDragProps {
  onDragEnter: (e: DragEvent<HTMLElement>) => void;
  onDragOver: (e: DragEvent<HTMLElement>) => void;
  onDragLeave: (e: DragEvent<HTMLElement>) => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
}

export interface UseRouteImport {
  /** Open the OS file picker. */
  openPicker: () => void;
  /** Spread onto any drop target (file dragged from outside the page). */
  dragProps: ImportDragProps;
  /** True while a file is being dragged over the target. */
  isDraggingOver: boolean;
  /** Filename the OS exposes for the dragged file (when available). */
  draggedName: string | null;
  /** Render once at the consumer — hidden file input + preview / error dialogs. */
  overlays: ReactNode;
}

/**
 * File-import plumbing for routes. Owns the file input, drag state, and
 * preview / error dialogs. Cross-store coordination still lives at the
 * caller via `onImport(preview, name)`.
 */
export function useRouteImport(
  onImport: (preview: ImportedRoute, name: string) => void,
): UseRouteImport {
  const inputRef = useRef<HTMLInputElement>(null);
  // dragenter / dragleave fire for child elements too — count nested entries
  // so we only flip isDraggingOver back off when the cursor truly leaves.
  const dragDepth = useRef(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggedName, setDraggedName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportedRoute | null>(null);
  const [errorState, setErrorState] = useState<{ filename: string; message: string } | null>(null);
  const activity = useActivityStore((s) => s.activity);

  const handleFile = useCallback(async (file: File) => {
    const result = await parseRouteFile(file);
    if (!result.ok) {
      setErrorState({ filename: file.name, message: result.error });
      return;
    }
    setPreview(result.preview);
  }, []);

  const openPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const isFileDrag = (e: DragEvent<HTMLElement>) =>
    Array.from(e.dataTransfer?.types ?? []).includes('Files');

  const dragProps: ImportDragProps = {
    onDragEnter: (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setIsDraggingOver(true);
      const item = e.dataTransfer.items?.[0];
      const name = item && item.kind === 'file' ? item.getAsFile()?.name ?? null : null;
      if (name) setDraggedName(name);
    },
    onDragOver: (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) {
        setIsDraggingOver(false);
        setDraggedName(null);
      }
    },
    onDrop: (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setIsDraggingOver(false);
      setDraggedName(null);
      const file = e.dataTransfer.files?.[0];
      if (file) void handleFile(file);
    },
  };

  const handleConfirm = useCallback(
    (name: string) => {
      if (!preview) return;
      const p = preview;
      setPreview(null);
      onImport(p, name);
    },
    [preview, onImport],
  );

  const overlays = (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        style={{ display: 'none' }}
        onChange={onInputChange}
      />
      {preview && (
        <ImportRouteDialog
          preview={preview}
          activity={activity}
          onCancel={() => setPreview(null)}
          onConfirm={handleConfirm}
        />
      )}
      {errorState && (
        <ImportErrorDialog
          filename={errorState.filename}
          message={errorState.message}
          onClose={() => setErrorState(null)}
        />
      )}
    </>
  );

  return { openPicker, dragProps, isDraggingOver, draggedName, overlays };
}
