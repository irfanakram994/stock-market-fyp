'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import {
  formatStockOption,
  mergeStockOptions,
  saveLastSelectedStockSymbol,
  type StockCatalogItem,
} from '@/lib/stockCatalog';

interface StockSymbolComboboxProps {
  value: string;
  onChange: (symbol: string) => void;
  stocks?: StockCatalogItem[];
  allowEmpty?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export default function StockSymbolCombobox({
  value,
  onChange,
  stocks = [],
  allowEmpty = false,
  emptyLabel = 'All stocks',
  disabled = false,
  className = '',
  placeholder = 'Search stock...',
}: StockSymbolComboboxProps) {
  const listboxId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const options = useMemo(() => mergeStockOptions(stocks), [stocks]);
  const selectedStock = useMemo(
    () => options.find((stock) => stock.symbol === value),
    [options, value],
  );

  useEffect(() => {
    if (!value && allowEmpty) {
      setQuery(emptyLabel);
      return;
    }
    setQuery(selectedStock ? formatStockOption(selectedStock) : value);
  }, [allowEmpty, emptyLabel, selectedStock, value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(selectedStock ? formatStockOption(selectedStock) : allowEmpty ? emptyLabel : value);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [allowEmpty, emptyLabel, selectedStock, value]);

  const filteredOptions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    const selectedLabel = selectedStock ? formatStockOption(selectedStock).toLowerCase() : '';
    const selectedSymbol = selectedStock?.symbol.toLowerCase() || '';
    if (
      !cleanQuery ||
      cleanQuery === selectedLabel ||
      cleanQuery === selectedSymbol ||
      (allowEmpty && cleanQuery === emptyLabel.toLowerCase())
    ) {
      return options;
    }

    return options
      .map((stock) => {
        const symbol = stock.symbol.toLowerCase();
        const name = stock.name.toLowerCase();
        const label = `${symbol} ${name}`;
        let rank = 4;
        if (symbol === cleanQuery) rank = 0;
        else if (symbol.startsWith(cleanQuery)) rank = 1;
        else if (name.startsWith(cleanQuery)) rank = 2;
        else if (label.includes(cleanQuery)) rank = 3;
        return { stock, rank };
      })
      .filter((item) => item.rank < 4)
      .sort((a, b) => a.rank - b.rank || a.stock.symbol.localeCompare(b.stock.symbol))
      .slice(0, 20)
      .map((item) => item.stock);
  }, [allowEmpty, emptyLabel, options, query, selectedStock]);

  const isEmptyQuery =
    !query.trim() || (allowEmpty && query.trim().toLowerCase() === emptyLabel.toLowerCase());
  const renderedOptions = allowEmpty && isEmptyQuery
    ? [{ symbol: '', name: emptyLabel }, ...filteredOptions]
    : filteredOptions;

  function selectStock(stock: StockCatalogItem) {
    onChange(stock.symbol);
    if (stock.symbol) saveLastSelectedStockSymbol(stock.symbol);
    setQuery(stock.symbol ? formatStockOption(stock) : emptyLabel);
    setOpen(false);
    setHighlightedIndex(0);
  }

  function resolveTypedStock() {
    const cleanQuery = query.trim().toLowerCase();
    if (allowEmpty && (!cleanQuery || cleanQuery === emptyLabel.toLowerCase())) {
      selectStock({ symbol: '', name: emptyLabel });
      return;
    }

    const match =
      options.find((stock) => stock.symbol.toLowerCase() === cleanQuery) ||
      options.find((stock) => formatStockOption(stock).toLowerCase() === cleanQuery) ||
      filteredOptions[0];

    if (match) selectStock(match);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlightedIndex((current) =>
        Math.min(current + 1, Math.max(renderedOptions.length - 1, 0)),
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const highlighted = renderedOptions[highlightedIndex];
      if (highlighted) selectStock(highlighted);
      else resolveTypedStock();
    } else if (event.key === 'Escape') {
      setOpen(false);
      setQuery(selectedStock ? formatStockOption(selectedStock) : allowEmpty ? emptyLabel : value);
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={query}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={resolveTypedStock}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setOpen(true);
          setHighlightedIndex(0);

          const exact = options.find(
            (stock) => stock.symbol.toLowerCase() === nextQuery.trim().toLowerCase(),
          );
          if (exact) onChange(exact.symbol);
          if (allowEmpty && nextQuery.trim() === '') onChange('');
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        className="w-full rounded-lg border border-gray-700 bg-dark-200 py-2 pl-10 pr-16 text-gray-200 transition-colors focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      {allowEmpty && value && (
        <button
          type="button"
          onClick={() => selectStock({ symbol: '', name: emptyLabel })}
          className="absolute right-8 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-200"
          aria-label="Clear stock"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-gray-200 disabled:cursor-not-allowed"
        aria-label="Toggle stock list"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 shadow-xl"
        >
          {renderedOptions.length > 0 ? (
            renderedOptions.map((stock, index) => (
              <button
                key={stock.symbol || '__empty'}
                type="button"
                role="option"
                aria-selected={stock.symbol === value}
                onMouseEnter={() => setHighlightedIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectStock(stock);
                }}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                  index === highlightedIndex
                    ? 'bg-primary/20 text-white'
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="w-16 shrink-0 font-semibold text-primary">
                  {stock.symbol || 'All'}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                  {stock.name || stock.symbol}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              No matching stocks
            </div>
          )}
        </div>
      )}
    </div>
  );
}
