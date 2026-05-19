import React from "react";

export function FormLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2.5">
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}

export function FormInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 focus:outline-none transition-all duration-150 disabled:bg-gray-50 disabled:text-gray-400 ${className}`}
    />
  );
}

export function FormSelect({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-4 py-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 focus:outline-none transition-all duration-150 cursor-pointer appearance-none pr-10 ${className}`}
      style={{
        backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
        backgroundPosition: "right 12px center",
        backgroundSize: "20px",
        backgroundRepeat: "no-repeat",
      }}
    >
      {children}
    </select>
  );
}

export function FormTextarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-4 py-3.5 rounded-xl border border-gray-200 text-sm text-gray-900 bg-white placeholder:text-gray-400 resize-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 focus:outline-none transition-all duration-150 ${className}`}
    />
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div className="pb-3 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

export function FormGrid({
  cols = 2,
  children,
}: {
  cols?: 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-${cols} gap-5`}>
      {children}
    </div>
  );
}

export function FormBtn({
  variant = "primary",
  children,
  className = "",
  ...props
}: {
  variant?: "primary" | "secondary" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary:
      "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200",
    secondary:
      "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200",
    danger: "bg-white hover:bg-red-50 text-red-600 border border-red-200",
  };
  return (
    <button
      {...props}
      className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
