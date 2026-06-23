import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string | string[];
  onChange: (value: any) => void;
  options: string[] | Option[];
  placeholder?: string;
  allOptionValue?: string; // defaults to "ALL"
  allOptionLabel: string;
  className?: string;
  disabled?: boolean;
  multiple?: boolean;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select option...",
  allOptionValue = "ALL",
  allOptionLabel,
  className = "",
  disabled = false,
  multiple = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize options to { value, label }
  const normalizedOptions = useMemo(() => {
    const list: Option[] = [];
    
    // Add the "All" option at the top
    list.push({ value: allOptionValue, label: allOptionLabel });

    options.forEach(opt => {
      if (typeof opt === "string") {
        list.push({ value: opt, label: opt });
      } else if (opt && typeof opt === "object") {
        list.push({ value: opt.value, label: opt.label });
      }
    });

    return list;
  }, [options, allOptionValue, allOptionLabel]);

  // Find active option label for single select
  const activeOption = useMemo(() => {
    return normalizedOptions.find(o => o.value === value) || normalizedOptions[0];
  }, [normalizedOptions, value]);

  const displayLabel = useMemo(() => {
    if (multiple) {
      const arr = Array.isArray(value) ? value : [value];
      if (arr.includes(allOptionValue) || arr.length === 0) {
        return allOptionLabel;
      }
      const labels = arr.map(v => normalizedOptions.find(o => o.value === v)?.label || v);
      return labels.join(", ");
    } else {
      return activeOption?.label || placeholder;
    }
  }, [value, multiple, activeOption, normalizedOptions, allOptionValue, allOptionLabel, placeholder]);

  // Filter options based on search input
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const lower = searchTerm.toLowerCase();
    
    // Always keep the "All" option, and filter the rest
    return normalizedOptions.filter((opt, index) => {
      if (index === 0) return true; // Keep "ALL"
      return opt.label.toLowerCase().includes(lower);
    });
  }, [normalizedOptions, searchTerm]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sync focus on input when open
  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    if (multiple) {
      const arr = Array.isArray(value) ? value : [value as string];
      if (val === allOptionValue) {
        onChange([allOptionValue]);
      } else {
        let newArr = arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
        newArr = newArr.filter(v => v !== allOptionValue);
        if (newArr.length === 0) {
          onChange([allOptionValue]);
        } else {
          onChange(newArr);
        }
      }
    } else {
      onChange(val);
      setIsOpen(false);
    }
  };

  const isSelected = (val: string) => {
    if (multiple) {
      return Array.isArray(value) ? value.includes(val) : value === val;
    }
    return value === val;
  };

  return (
    <div ref={containerRef} className={`relative select-none ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold rounded-lg border text-left cursor-pointer transition-all ${
          disabled
            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            : isOpen
            ? "bg-white border-blue-500 ring-2 ring-blue-500/10 text-gray-800 shadow-xs"
            : "bg-slate-50/50 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-slate-50"
        }`}
      >
        <span className="truncate pr-2 block">
          {displayLabel}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-500" : ""}`} />
      </button>

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div className="absolute z-55 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg ring-1 ring-black/5 animate-fade-in divide-y divide-gray-100 min-w-[200px]">
          {/* Search Box */}
          <div className="p-2 relative flex items-center gap-1.5 bg-slate-50/50 rounded-t-xl">
            <Search className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1.5" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Type to search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-xs text-gray-750 placeholder-gray-400 py-1.5 pr-6 font-medium focus:outline-none focus:ring-0"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="text-[11px] text-gray-400 py-4 text-center">
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const selected = isSelected(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelect(opt.value);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs rounded-md transition-all cursor-pointer ${
                      selected
                        ? "bg-blue-50/80 text-blue-700 font-bold"
                        : "text-gray-700 hover:bg-slate-50 font-medium"
                    }`}
                  >
                    <span className="truncate pr-4">{opt.label}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
