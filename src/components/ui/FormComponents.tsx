import React from "react";
import { UploadCloud } from "lucide-react";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-slate-800"
      >
        {label}
        {required && <span className="ml-1 text-orange-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

const INPUT_BASE =
  "block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:bg-slate-100";

export function TextInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${INPUT_BASE} ${className}`} {...props} />;
}

export function SelectInput({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${INPUT_BASE} ${className}`} {...props}>
      {children}
    </select>
  );
}

export function TextareaInput({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      className={`${INPUT_BASE} resize-y ${className}`}
      {...props}
    />
  );
}

interface FileUploadBoxProps {
  id: string;
  label: string;
  helperText?: string;
  statusLabel?: string;
}

export function FileUploadBox({
  id,
  label,
  helperText = "PNG, JPG, or PDF up to 5 MB (private storage in Batch 4+)",
  statusLabel,
}: FileUploadBoxProps) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center transition hover:border-orange-400 hover:bg-orange-50/30"
    >
      <UploadCloud className="h-7 w-7 text-orange-500" />
      <span className="mt-2 text-sm font-semibold text-[#181A20]">{label}</span>
      <span className="mt-1 text-xs text-slate-500">{helperText}</span>
      {statusLabel && (
        <span className="mt-2 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-700">
          {statusLabel}
        </span>
      )}
      <input id={id} type="file" className="sr-only" disabled />
    </label>
  );
}
