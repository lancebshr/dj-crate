"use client";

import { useState, useCallback, useRef } from "react";

interface CsvUploadProps {
  onFileLoaded: (csvText: string) => void;
  isLoading?: boolean;
}

export function CsvUpload({ onFileLoaded, isLoading }: CsvUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        alert("Please upload a CSV file.");
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          onFileLoaded(text);
        }
      };
      reader.readAsText(file);
    },
    [onFileLoaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
        ${
          isDragging
            ? "border-green-500 bg-green-500/5"
            : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50"
        }
        ${isLoading ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleInputChange}
        className="hidden"
      />

      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-2 border-green-500 border-t-transparent rounded-full" />
          <p className="text-sm text-zinc-400">Processing {fileName}...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="text-3xl text-zinc-600">
            {fileName ? "+" : "\u2191"}
          </div>
          {fileName ? (
            <>
              <p className="text-sm text-green-400">{fileName} loaded</p>
              <p className="text-xs text-zinc-500">
                Drop another file to replace
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-300">
                Drop a CSV file here, or click to browse
              </p>
              <p className="text-xs text-zinc-500">
                Supports Exportify, Spotify exports, or any CSV with track name
                + artist columns
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
