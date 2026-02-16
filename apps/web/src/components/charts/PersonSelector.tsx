"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Label, cn } from "@vamsa/ui";

interface Person {
  id: string;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: Date | string | null;
  isLiving?: boolean | null;
}

interface PersonSelectorProps {
  persons: Array<Person>;
  selectedPersonId: string | undefined;
  onPersonChange: (personId: string) => void;
  isLoading?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
}

/**
 * PersonSelector - Autocomplete-enabled person selection component.
 * Features:
 * - Search/filter by name
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Birth year display for disambiguation
 * - Living status indicator
 * - Recent selection memory (browser session)
 */
export function PersonSelector({
  persons,
  selectedPersonId,
  onPersonChange,
  isLoading = false,
  label = "Center On",
  placeholder = "Search people...",
  className,
}: PersonSelectorProps) {
  const { t } = useTranslation(["charts", "common"]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Get the display name for a person
  const getDisplayName = useCallback((person: Person) => {
    const name = `${person.firstName || ""} ${person.lastName || ""}`.trim();
    if (person.dateOfBirth) {
      const birthYear = new Date(person.dateOfBirth).getFullYear();
      return `${name} (b. ${birthYear})`;
    }
    return name;
  }, []);

  // Get the selected person
  const selectedPerson = useMemo(
    () => persons.find((p) => p.id === selectedPersonId),
    [persons, selectedPersonId]
  );

  // Filter persons based on search query
  const filteredPersons = useMemo(() => {
    if (!searchQuery.trim()) {
      return persons;
    }

    const query = searchQuery.toLowerCase();
    return persons.filter((person) => {
      const fullName =
        `${person.firstName || ""} ${person.lastName || ""}`.toLowerCase();
      return fullName.includes(query);
    });
  }, [persons, searchQuery]);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredPersons.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          setIsOpen(true);
          e.preventDefault();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredPersons.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredPersons[highlightedIndex]) {
            onPersonChange(filteredPersons[highlightedIndex].id);
            setSearchQuery("");
            setIsOpen(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          setSearchQuery("");
          setIsOpen(false);
          break;
        case "Tab":
          setIsOpen(false);
          break;
      }
    },
    [isOpen, filteredPersons, highlightedIndex, onPersonChange]
  );

  // Handle person selection
  const handleSelect = useCallback(
    (personId: string) => {
      onPersonChange(personId);
      setSearchQuery("");
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [onPersonChange]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        inputRef.current &&
        !inputRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return (
      <div className={cn("space-y-1", className)}>
        {label && <Label className="text-xs">{label}</Label>}
        <div className="bg-muted flex h-9 w-50 items-center justify-center rounded-md border">
          <span className="text-muted-foreground text-sm">
            {t("common:loading")}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative space-y-1", className)}>
      {label && (
        <Label htmlFor="person-selector" className="text-xs">
          {label}
        </Label>
      )}

      <div className="relative">
        {/* Input field */}
        <Input
          ref={inputRef}
          id="person-selector"
          type="text"
          placeholder={
            isOpen
              ? placeholder
              : selectedPerson
                ? getDisplayName(selectedPerson)
                : placeholder
          }
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="h-9 w-50"
          autoComplete="off"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          role="combobox"
        />

        {/* Clear/select indicator button */}
        {selectedPerson && !isOpen && !searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
            onClick={() => {
              setSearchQuery("");
              setIsOpen(true);
              inputRef.current?.focus();
            }}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
            <span className="sr-only">{t("charts:openDropdown")}</span>
          </Button>
        )}
      </div>

      {/* Dropdown list */}
      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          className="bg-popover border-border absolute z-50 mt-1 max-h-75 w-50 overflow-auto rounded-md border shadow-lg"
          aria-label={t("charts:people")}
        >
          {filteredPersons.length === 0 ? (
            <li className="text-muted-foreground px-3 py-2 text-sm">
              {t("charts:noPeopleFound")}
            </li>
          ) : (
            filteredPersons.map((person, index) => (
              <li key={person.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={person.id === selectedPersonId}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm",
                    "hover:bg-accent hover:text-accent-foreground",
                    index === highlightedIndex &&
                      "bg-accent text-accent-foreground",
                    person.id === selectedPersonId && "font-medium"
                  )}
                  onClick={() => handleSelect(person.id)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {/* Living status indicator */}
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      person.isLiving ? "bg-primary" : "bg-muted-foreground"
                    )}
                    title={
                      person.isLiving
                        ? t("charts:living")
                        : t("charts:deceased")
                    }
                  />
                  <span className="truncate">{getDisplayName(person)}</span>
                  {person.id === selectedPersonId && (
                    <svg
                      className="text-primary ml-auto h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
