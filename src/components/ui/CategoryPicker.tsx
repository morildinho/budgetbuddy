"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";

interface CategoryOption {
  value: string;
  label: string;
}

interface CategoryPickerProps {
  value: string;
  onChange: (value: string) => void;
  options: CategoryOption[];
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function CategoryPicker({
  value,
  onChange,
  options,
  label,
  error,
  disabled,
  className,
  placeholder = "Velg kategori",
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className={cn("w-full", className)} ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-left text-sm transition-all duration-200",
            "focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[var(--accent-danger)]",
            isOpen && "border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]"
          )}
        >
          <span className={selectedOption ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-[var(--text-muted)] transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-lg">
            {/* Search input (show when more than 10 options) */}
            {options.length > 10 && (
              <div className="border-b border-[var(--border-primary)] p-2">
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Søk..."
                  className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
                />
              </div>
            )}

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-[var(--text-muted)]">Ingen treff</p>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      "flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors",
                      option.value === value
                        ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                    )}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-[var(--accent-danger)]">{error}</p>}
    </div>
  );
}
