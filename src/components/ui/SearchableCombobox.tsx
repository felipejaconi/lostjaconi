import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";

export function SearchableCombobox({
  options,
  value,
  onChange,
  placeholder,
  onAddNew,
  labelKey = "nome",
  valueKey = "id",
  renderOption,
}: {
  options: any[];
  value: any;
  onChange: (val: any) => void;
  placeholder: string;
  onAddNew?: () => void;
  labelKey?: string;
  valueKey?: string;
  renderOption?: (opt: any) => React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o[valueKey] == value);
  const displayValue = selectedOption ? selectedOption[labelKey] : search;

  const filtered = options.filter((o) => {
    const term = search.toLowerCase();
    const lbl = String(o[labelKey]).toLowerCase();
    const ean = o.barcode_ean ? String(o.barcode_ean).toLowerCase() : "";
    return lbl.includes(term) || ean.includes(term);
  });

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          value={isOpen ? search : (selectedOption ? selectedOption[labelKey] : "")}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (!e.target.value) onChange("");
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch("");
          }}
          placeholder={placeholder}
          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 sm:py-2 text-sm text-white focus:border-emerald-500/50 outline-none transition-colors"
        />
        <ChevronDown size={16} className="absolute right-3 text-slate-500 pointer-events-none" />
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] bg-[#1a1a1a] border border-white/10 rounded-xl max-h-60 overflow-y-auto shadow-2xl">
          {filtered.length > 0 ? (
            filtered.map((opt, index) => (
              <div
                key={opt[valueKey] || index}
                onClick={() => {
                  onChange(opt[valueKey]);
                  setIsOpen(false);
                }}
                className="px-4 py-2 text-sm text-white hover:bg-emerald-500/20 cursor-pointer border-b border-white/5 last:border-0"
              >
                {renderOption ? renderOption(opt) : opt[labelKey]}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">Nenhum resultado</div>
          )}
          
          {onAddNew && (
            <div
              onClick={() => {
                onAddNew();
                setIsOpen(false);
              }}
              className="px-4 py-3 text-sm font-bold text-emerald-500 hover:bg-emerald-500/10 cursor-pointer border-t border-white/10 text-center sticky bottom-0 bg-[#1a1a1a]"
            >
              + Criar Novo
            </div>
          )}
        </div>
      )}
    </div>
  );
}
