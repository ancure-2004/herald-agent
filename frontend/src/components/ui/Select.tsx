"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  icon?: React.ElementType;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  title?: string;
  id?: string;
  "aria-label"?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  icon: Icon,
  className = "",
  triggerClassName = "",
  disabled = false,
  title,
  id,
  "aria-label": ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "bottom" | "top";
  }>({
    top: 0,
    left: 0,
    width: 0,
    placement: "bottom",
  });
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const autoId = useId();
  const selectId = id || autoId;

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  // Viewport-aware positioning
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownHeight = Math.min(options.length * 36 + 16, 240); // estimate or measure
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    const placement: "bottom" | "top" =
      spaceBelow < dropdownHeight && spaceAbove > spaceBelow
        ? "top"
        : "bottom";

    const top =
      placement === "bottom"
        ? rect.bottom + 4
        : Math.max(8, rect.top - dropdownHeight - 4);

    // Keep horizontally within viewport
    const width = Math.max(rect.width, 160);
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8
    );

    setCoords({
      top,
      left,
      width,
      placement,
    });
  }, [options.length]);

  const handleOpen = () => {
    if (disabled) return;
    updatePosition();
    setIsOpen((prev) => !prev);
    const currIdx = options.findIndex((opt) => opt.value === value);
    setHighlightedIndex(currIdx >= 0 ? currIdx : 0);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Recalculate on scroll/resize when open
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen, updatePosition]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      handleClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      handleClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev + 1;
        while (next < options.length && options[next].disabled) {
          next++;
        }
        return next < options.length ? next : prev;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev - 1;
        while (next >= 0 && options[next].disabled) {
          next--;
        }
        return next >= 0 ? next : prev;
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (
        highlightedIndex >= 0 &&
        highlightedIndex < options.length &&
        !options[highlightedIndex].disabled
      ) {
        onChange(options[highlightedIndex].value);
        handleClose();
      }
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (!isOpen || highlightedIndex < 0 || !dropdownRef.current) return;
    const items = dropdownRef.current.querySelectorAll<HTMLButtonElement>("[data-select-item]");
    const activeItem = items[highlightedIndex];
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || title}
        title={title}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#27272A] hover:border-slate-300 dark:hover:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${triggerClassName}`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0" />}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-zinc-400 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            tabIndex={-1}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            className="fixed z-[999999] max-h-60 overflow-y-auto rounded-xl p-1 bg-white dark:bg-[#1C1C1F] border border-zinc-200 dark:border-zinc-700/80 shadow-2xl text-xs animate-in fade-in zoom-in-95 duration-100 focus:outline-none"
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;

              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  data-select-item
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    handleClose();
                  }}
                  onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer select-none ${
                    opt.disabled
                      ? "opacity-40 cursor-not-allowed text-slate-400"
                      : isSelected
                      ? "bg-zinc-100 dark:bg-white/[0.08] text-zinc-900 dark:text-white font-bold"
                      : isHighlighted
                      ? "bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-zinc-200"
                      : "text-slate-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};
