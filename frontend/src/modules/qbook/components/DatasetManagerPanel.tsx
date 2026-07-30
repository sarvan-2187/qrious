import React, { useEffect, useRef, useState } from 'react';
import { FaChevronDown, FaChevronUp, FaCloudUploadAlt, FaDatabase, FaSpinner, FaTrash } from 'react-icons/fa';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { useQBookDatasetsApi } from '../hooks/useQBookDatasetsApi';
import type { Dataset } from '../types';

interface DatasetManagerPanelProps {
  /** From the same useQBookKernelSocket instance the notebook's cells run
   * against — reusing it (rather than this panel opening its own) keeps the
   * dataset load on the same kernel session a cell would actually read from.
   */
  attachDataset: (filename: string, buffer: ArrayBuffer) => Promise<void>;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DatasetManagerPanel: React.FC<DatasetManagerPanelProps> = ({ attachDataset }) => {
  const { theme } = useTheme();
  const { listDatasets, uploadDataset, fetchDatasetBytes, deleteDataset, error } = useQBookDatasetsApi();

  const [expanded, setExpanded] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    listDatasets().then(setDatasets).catch(() => {});
  };

  useEffect(() => {
    if (expanded) refresh();
  }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setStatusMessage(null);
    setUploadProgress(0);
    try {
      await uploadDataset(file, setUploadProgress);
      refresh();
    } catch (err: any) {
      setStatusMessage(err.message || 'Upload failed.');
    } finally {
      setUploadProgress(null);
    }
  };

  const handleLoad = async (dataset: Dataset) => {
    setStatusMessage(null);
    setLoadingId(dataset.id);
    try {
      const { filename, buffer } = await fetchDatasetBytes(dataset.id);
      await attachDataset(filename, buffer);
      setStatusMessage(`Loaded "${filename}" — try pd.read_csv("datasets/${filename}") in a cell.`);
    } catch (err: any) {
      setStatusMessage(err.message || 'Could not load this dataset into the notebook.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (dataset: Dataset) => {
    try {
      await deleteDataset(dataset.id);
      refresh();
    } catch (err: any) {
      setStatusMessage(err.message || 'Could not delete this dataset.');
    }
  };

  return (
    <div className={cn(
      "rounded-lg border transition-colors",
      theme === 'dark' ? "bg-zinc-950/50 border-white/10" : "bg-white border-zinc-200",
    )}>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <FaDatabase className="w-3.5 h-3.5" /> My Datasets
        </span>
        {expanded ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadProgress !== null}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md font-medium transition-colors text-xs border",
                theme === 'dark'
                  ? "bg-zinc-900 border-white/10 hover:border-emerald-500/50"
                  : "bg-zinc-50 border-zinc-200 hover:border-emerald-500/30",
                uploadProgress !== null && "opacity-60 cursor-not-allowed",
              )}
            >
              {uploadProgress !== null ? (
                <><FaSpinner className="w-3 h-3 animate-spin" /> Uploading {uploadProgress}%</>
              ) : (
                <><FaCloudUploadAlt className="w-3.5 h-3.5" /> Upload CSV</>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileSelected} />
            <span className="text-xs opacity-60">CSV only, up to 10MB.</span>
          </div>

          {(statusMessage || error) && (
            <div className="text-xs px-3 py-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
              {statusMessage || error}
            </div>
          )}

          {datasets.length === 0 ? (
            <p className="text-xs opacity-60">No datasets uploaded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {datasets.map((dataset) => (
                <li
                  key={dataset.id}
                  className={cn(
                    "flex items-center justify-between gap-2 px-3 py-2 rounded-md text-xs border",
                    theme === 'dark' ? "border-white/10" : "border-zinc-200",
                  )}
                >
                  <span className="truncate">{dataset.filename} <span className="opacity-50">({formatSize(dataset.size_bytes)})</span></span>
                  <span className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleLoad(dataset)}
                      disabled={loadingId === dataset.id}
                      className="px-2 py-1 rounded border border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-60"
                    >
                      {loadingId === dataset.id ? <FaSpinner className="w-3 h-3 animate-spin" /> : 'Load into notebook'}
                    </button>
                    <button
                      onClick={() => handleDelete(dataset)}
                      className="p-1.5 rounded border border-red-500/30 text-red-500 hover:bg-red-500/10"
                      title="Delete dataset"
                    >
                      <FaTrash className="w-3 h-3" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
