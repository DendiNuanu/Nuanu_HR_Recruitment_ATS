"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Plus } from "lucide-react";

type Department = {
  id: string;
  name: string;
};

export default function DepartmentCombobox({ 
  departments, 
  initialName = "" 
}: { 
  departments: Department[];
  initialName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState(initialName);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(query.toLowerCase())
  );

  const showCreateOption = query.length > 0 && !departments.some(d => d.name.toLowerCase() === query.toLowerCase());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  return (
    <div className="relative" ref={dropdownRef}>
      <input type="hidden" name="departmentName" value={selectedName} required />
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="input-field flex items-center justify-between cursor-pointer group hover:border-emerald-400 transition-colors"
      >
        <span className={selectedName ? "text-nuanu-navy" : "text-nuanu-gray-400"}>
          {selectedName || "Select or type a department..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-nuanu-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-nuanu-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
          <div className="p-2 border-b border-nuanu-gray-100 flex items-center gap-2 bg-nuanu-gray-50">
            <Search className="w-4 h-4 text-nuanu-gray-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search or type new..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 text-sm py-1"
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {filteredDepartments.map((dept) => (
              <button
                key={dept.id}
                type="button"
                onClick={() => handleSelect(dept.name)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center justify-between group"
              >
                {dept.name}
              </button>
            ))}

            {showCreateOption && (
              <button
                type="button"
                onClick={() => handleSelect(query)}
                className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 font-bold hover:bg-emerald-50 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create "{query}"
              </button>
            )}

            {filteredDepartments.length === 0 && !showCreateOption && (
              <div className="px-4 py-8 text-center text-nuanu-gray-400 text-sm">
                No matching departments.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
