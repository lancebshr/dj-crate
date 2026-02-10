"use client";

import { useState, useCallback, useEffect } from "react";

interface BpmRangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export function BpmRangeSlider({
  min,
  max,
  value,
  onChange,
}: BpmRangeSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleMinChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newMin = Math.min(Number(e.target.value), localValue[1] - 1);
      const newValue: [number, number] = [newMin, localValue[1]];
      setLocalValue(newValue);
      onChange(newValue);
    },
    [localValue, onChange]
  );

  const handleMaxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newMax = Math.max(Number(e.target.value), localValue[0] + 1);
      const newValue: [number, number] = [localValue[0], newMax];
      setLocalValue(newValue);
      onChange(newValue);
    },
    [localValue, onChange]
  );

  const minPercent = ((localValue[0] - min) / (max - min)) * 100;
  const maxPercent = ((localValue[1] - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-mono text-zinc-400 w-8 text-right">
        {localValue[0]}
      </span>

      <div className="relative flex-1 h-8 flex items-center">
        {/* Track background */}
        <div className="absolute w-full h-1 bg-zinc-800 rounded-full" />

        {/* Active range */}
        <div
          className="absolute h-1 bg-green-500 rounded-full"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={localValue[0]}
          onChange={handleMinChange}
          className="absolute w-full h-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-500"
        />

        {/* Max thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={localValue[1]}
          onChange={handleMaxChange}
          className="absolute w-full h-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-500"
        />
      </div>

      <span className="text-sm font-mono text-zinc-400 w-8">
        {localValue[1]}
      </span>

      <span className="text-xs text-zinc-500 ml-1">BPM</span>
    </div>
  );
}
