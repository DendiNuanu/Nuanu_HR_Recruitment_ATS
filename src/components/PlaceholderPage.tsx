"use client";
import { Construction } from "lucide-react";

export default function PlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-12rem)] text-center">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
        <Construction className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-bold text-nuanu-navy mb-2">Module In Development</h1>
      <p className="text-nuanu-gray-500 max-w-md">
        This module is part of the upcoming enterprise release. It will connect to the Nuanu core database to provide advanced functionality.
      </p>
    </div>
  );
}
