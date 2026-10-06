'use client';
import { useState } from 'react';
import type { ImageRegion } from '@/lib/image-region';
export function RegionPicker({
  url,
  value,
  onChange,
  disabled,
}: {
  url: string;
  value: ImageRegion | null;
  onChange: (value: ImageRegion | null) => void;
  disabled: boolean;
}) {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  return (
    <details className="region-picker">
      <summary>Select image region{value ? ' · crop selected' : ' (optional)'}</summary>
      <p className="fine-print">
        Click two opposite corners around a detail, or enter percentages below. The crop comes from
        the original image; it cannot recover detail absent from that file.
      </p>
      <div
        className="region-image"
        onClick={(event) => {
          if (disabled) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = Math.min(
            99,
            Math.max(0, Math.round((100 * (event.clientX - rect.left)) / rect.width)),
          );
          const y = Math.min(
            99,
            Math.max(0, Math.round((100 * (event.clientY - rect.top)) / rect.height)),
          );
          if (!start) setStart({ x, y });
          else {
            onChange({
              x: Math.min(x, start.x),
              y: Math.min(y, start.y),
              width: Math.max(1, Math.abs(x - start.x)),
              height: Math.max(1, Math.abs(y - start.y)),
            });
            setStart(null);
          }
        }}
      >
        <img src={url} alt="Original image for selecting a detail region" draggable={false} />
        {value && (
          <span
            className="region-outline"
            style={{
              left: `${value.x}%`,
              top: `${value.y}%`,
              width: `${value.width}%`,
              height: `${value.height}%`,
            }}
          />
        )}
        {start && (
          <span className="region-corner" style={{ left: `${start.x}%`, top: `${start.y}%` }} />
        )}
      </div>
      <p className="fine-print" role="status">
        {start
          ? 'First corner selected. Click the opposite corner.'
          : value
            ? 'Only the selected crop will be sent with the category findings.'
            : 'Full image selected.'}
      </p>
      <div className="region-fields">
        {(['x', 'y', 'width', 'height'] as const).map((field) => (
          <label className="field" key={field}>
            {field === 'x'
              ? 'Left (%)'
              : field === 'y'
                ? 'Top (%)'
                : `${field === 'width' ? 'Width' : 'Height'} (%)`}
            <input
              type="number"
              min={field === 'x' || field === 'y' ? 0 : 1}
              max={100}
              value={(value || { x: 0, y: 0, width: 100, height: 100 })[field]}
              disabled={disabled}
              onChange={(event) => {
                const next = {
                  ...(value || { x: 0, y: 0, width: 100, height: 100 }),
                  [field]: Math.max(
                    field === 'x' || field === 'y' ? 0 : 1,
                    Math.min(100, Number(event.target.value)),
                  ),
                };
                next.x = Math.min(next.x, 99);
                next.y = Math.min(next.y, 99);
                next.width = Math.min(next.width, 100 - next.x);
                next.height = Math.min(next.height, 100 - next.y);
                onChange(next);
                setStart(null);
              }}
            />
          </label>
        ))}
      </div>
      <button
        className="text-button"
        type="button"
        disabled={disabled}
        onClick={() => {
          onChange(null);
          setStart(null);
        }}
      >
        Use full image
      </button>
    </details>
  );
}
