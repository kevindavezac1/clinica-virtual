import { useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function FechaNacimientoInput({ value, onChange, required }: Props) {
  const partes = value ? value.split("-") : ["", "", ""];
  const [yyyy, setYyyy] = useState(partes[0]);
  const [mm, setMm] = useState(partes[1] || "");
  const [dd, setDd] = useState(partes[2] || "");

  const anioActual = new Date().getFullYear();

  const emit = (newYyyy: string, newMm: string, newDd: string) => {
    const y = Number(newYyyy), m = Number(newMm), d = Number(newDd);
    if (!y || !m || !d || newYyyy.length < 4) { onChange(""); return; }
    if (y < 1900 || y > anioActual) { onChange(""); return; }
    if (m < 1 || m > 12) { onChange(""); return; }
    if (d < 1) { onChange(""); return; }
    const maxDia = new Date(y, m, 0).getDate();
    const diaFinal = Math.min(d, maxDia);
    onChange(`${newYyyy}-${String(m).padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`);
  };

  const inputClass = "min-w-0 w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-900 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <div className="grid grid-cols-3 gap-2">
      <input
        type="number"
        className={inputClass}
        placeholder="DD"
        value={dd}
        min={1}
        max={31}
        onChange={e => {
          let v = e.target.value.replace(/\D/g, "").slice(0, 2);
          if (Number(v) > 31) v = "31";
          setDd(v);
          emit(yyyy, mm, v);
        }}
        required={required}
      />

      <input
        type="number"
        className={inputClass}
        placeholder="MM"
        value={mm}
        min={1}
        max={12}
        onChange={e => {
          let v = e.target.value.replace(/\D/g, "").slice(0, 2);
          if (Number(v) > 12) v = "12";
          setMm(v);
          emit(yyyy, v, dd);
        }}
        required={required}
      />

      <input
        type="number"
        className={inputClass}
        placeholder="AAAA"
        value={yyyy}
        min={1900}
        max={anioActual}
        onChange={e => {
          let v = e.target.value.replace(/\D/g, "").slice(0, 4);
          if (v.length === 4 && Number(v) > anioActual) v = String(anioActual);
          setYyyy(v);
          emit(v, mm, dd);
        }}
        required={required}
      />
    </div>
  );
}
