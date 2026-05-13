"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Plus } from "lucide-react";

type Department = {
  id: string;
  name: string;
  code?: string;
};

// ── Nuanu Department Group Map ────────────────────────────────────────────────
// Each entry maps a group label to the set of codes belonging to that group.
const GROUP_CODES: Record<string, string[]> = {
  "Core Divisions": [
    "ARTS",
    "EDU",
    "WELL",
    "EXP",
    "NAT",
    "TECH",
    "HOSP",
    "COMM",
    "BIZ",
  ],
  "HR / Recruitment": ["HR", "TACQ", "ORGDEV", "HROP"],
  "Engineering & Facilities": [
    "ENG",
    "MEP",
    "BLDMNT",
    "INFRA",
    "SITEENG",
    "UTIL",
  ],
  Operations: ["OPS", "SITEOP", "GUESTOP", "EVTOP", "TOUROP"],
  "Sales & Marketing": ["MKT", "SALES", "PARTNER", "BRAND", "EVTSLS", "DGTMKT"],
  "Finance & Accounting": ["FIN", "ACCT", "BUDGET"],
  "IT / Product / Technology": [
    "PROD",
    "TECH",
    "PRODMGMT",
    "SYSANAL",
    "UXRES",
    "PLATDEV",
    "INTSYS",
  ],
  "Creative & Media": [
    "DES",
    "CRPROD",
    "CONTPROD",
    "MEDIA",
    "PHOTOVID",
    "ARTDIR",
  ],
  "Safety & Medical": ["EMGR", "NURSE", "HSE"],
  "Hospitality & F&B": [
    "HOSP",
    "RESTOP",
    "KITCHEN",
    "CHEF",
    "ACCOMM",
    "GUESTEXP",
  ],
  "Events & Entertainment": ["EXP", "EVTMGMT", "MUSIC", "EXHIB", "COMMEVT"],
  "Sustainability & Environment": ["NAT", "WASTE", "REFOR", "MANGR", "BIODIV"],
  Executive: ["EXEC"],
  "Other / Custom": [],
};

const GROUP_ORDER = Object.keys(GROUP_CODES);

function groupDepartments(
  departments: Department[],
): Array<{ group: string; items: Department[] }> {
  // Track which departments have been placed to avoid duplicates
  const placed = new Set<string>();
  const grouped: Array<{ group: string; items: Department[] }> = [];

  for (const group of GROUP_ORDER) {
    if (group === "Other / Custom") continue;
    const codes = GROUP_CODES[group];
    const items = departments.filter(
      (d) => d.code && codes.includes(d.code) && !placed.has(d.id),
    );
    if (items.length > 0) {
      items.forEach((d) => placed.add(d.id));
      grouped.push({ group, items });
    }
  }

  // Anything not matched goes to "Other / Custom"
  const others = departments.filter((d) => !placed.has(d.id));
  if (others.length > 0) {
    grouped.push({ group: "Other / Custom", items: others });
  }

  return grouped;
}

export default function DepartmentCombobox({
  departments,
  initialName = "",
}: {
  departments: Department[];
  initialName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState(initialName);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter departments by query across all groups
  const lowerQuery = query.toLowerCase();
  const filteredDepts = query
    ? departments.filter((d) => d.name.toLowerCase().includes(lowerQuery))
    : departments;

  // When searching, show flat list; when not searching, show grouped
  const isSearching = query.length > 0;
  const groupedView = isSearching ? null : groupDepartments(departments);
  const flatView = isSearching ? filteredDepts : null;

  const exactMatch = departments.some(
    (d) => d.name.toLowerCase() === lowerQuery,
  );
  const showCreateOption = query.length > 0 && !exactMatch;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (name: string) => {
    setSelectedName(name);
    setQuery("");
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (flatView && flatView.length === 1) {
        handleSelect(flatView[0].name);
      } else if (showCreateOption) {
        handleSelect(query);
      }
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        type="hidden"
        name="departmentName"
        value={selectedName}
        required
      />

      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="input-field flex items-center justify-between cursor-pointer group hover:border-emerald-400 transition-colors"
      >
        <span
          className={selectedName ? "text-nuanu-navy" : "text-nuanu-gray-400"}
        >
          {selectedName || "Select or type a department..."}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-nuanu-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-nuanu-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Search bar */}
          <div className="p-2 border-b border-nuanu-gray-100 flex items-center gap-2 bg-nuanu-gray-50">
            <Search className="w-4 h-4 text-nuanu-gray-400 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search or type new department..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-none focus:ring-0 text-sm py-1"
            />
          </div>

          <div className="max-h-72 overflow-y-auto">
            {/* ── Flat search results ── */}
            {isSearching && (
              <>
                {flatView!.map((dept) => (
                  <button
                    key={dept.id}
                    type="button"
                    onClick={() => handleSelect(dept.name)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center justify-between"
                  >
                    {dept.name}
                    {dept.code && (
                      <span className="text-[10px] text-nuanu-gray-300 font-mono ml-2">
                        {dept.code}
                      </span>
                    )}
                  </button>
                ))}

                {flatView!.length === 0 && !showCreateOption && (
                  <div className="px-4 py-8 text-center text-nuanu-gray-400 text-sm">
                    No matching departments.
                  </div>
                )}
              </>
            )}

            {/* ── Grouped view (no search) ── */}
            {!isSearching &&
              groupedView!.map(({ group, items }) => (
                <div key={group}>
                  <div className="px-3 pt-3 pb-1">
                    <span className="text-[9px] font-black text-nuanu-gray-300 uppercase tracking-[0.2em]">
                      {group}
                    </span>
                  </div>
                  {items.map((dept) => (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => handleSelect(dept.name)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center justify-between"
                    >
                      {dept.name}
                      {dept.code && (
                        <span className="text-[10px] text-nuanu-gray-300 font-mono ml-2">
                          {dept.code}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}

            {/* ── Create custom option ── */}
            {showCreateOption && (
              <button
                type="button"
                onClick={() => handleSelect(query)}
                className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 font-bold hover:bg-emerald-50 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create custom: &ldquo;{query}
                &rdquo;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
