"use client";
import { useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import type { Pandal } from "@/lib/types";
import { formatDistance } from "@/lib/geo";

export function AreaSearchBar({
  value,
  onChange,
  results,
  onSelect,
}: {
  value: string;
  onChange: (value: string) => void;
  results: Pandal[];
  onSelect: (pandal: Pandal) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const expanded = open && value.trim().length > 0;
  return (
    <div
      className="area-search-wrap"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div className="area-search">
        <label htmlFor="area-search" className="sr-only">
          Search an area or Ganapati
        </label>
        <input
          id="area-search"
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls="pandal-search-results"
          aria-expanded={expanded}
          aria-activedescendant={
            expanded && active >= 0
              ? `search-result-${results[active]?.id}`
              : undefined
          }
          placeholder="Search an area..."
          autoComplete="off"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setActive(-1);
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(results.length - 1, index + 1));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(0, index - 1));
            }
            if (event.key === "Enter" && expanded && results[active]) {
              event.preventDefault();
              onSelect(results[active]);
              setOpen(false);
            }
          }}
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            className="icon-button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
          >
            <X size={18} />
          </button>
        )}
        <Search size={21} aria-hidden="true" />
      </div>
      {expanded && (
        <div className="search-dropdown">
          <div
            id="pandal-search-results"
            role="listbox"
            aria-label="Matching Ganapatis"
          >
            {results.map((pandal, index) => (
              <div
                key={pandal.id}
                id={`search-result-${pandal.id}`}
                role="option"
                aria-selected={index === active}
                className="search-result"
                onMouseDown={(event) => event.preventDefault()}
              >
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelect(pandal);
                    setOpen(false);
                  }}
                >
                  <MapPin size={17} />
                  <span>
                    <strong>{pandal.name}</strong>
                    <small>
                      {pandal.area}
                      {pandal.distanceKm !== undefined &&
                        ` · ${formatDistance(pandal.distanceKm)}`}
                    </small>
                  </span>
                </button>
              </div>
            ))}
          </div>
          {!results.length && (
            <p className="search-no-results" role="status">
              No listed Ganapati found for this search.
            </p>
          )}
          <p className="search-scope">
            Searches all listed Ganapatis, including places outside your radius.
          </p>
        </div>
      )}
    </div>
  );
}
