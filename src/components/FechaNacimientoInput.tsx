import { useMemo } from "react";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function FechaNacimientoInput({ value, onChange, required }: Props) {
  const [yyyy, mm, dd] = value ? value.split("-") : ["", "", ""];

  const anioActual = new Date().getFullYear();
  const anios = useMemo(
    () => Array.from({ length: anioActual - 1900 + 1 }, (_, i) => anioActual - i),
    [anioActual]
  );

  const diasEnMes = useMemo(() => {
    if (!yyyy || !mm) return 31;
    return new Date(Number(yyyy), Number(mm), 0).getDate();
  }, [yyyy, mm]);

  const update = (newYyyy: string, newMm: string, newDd: string) => {
    if (!newYyyy || !newMm || !newDd) { onChange(""); return; }
    const maxDia = new Date(Number(newYyyy), Number(newMm), 0).getDate();
    const diaFinal = Math.min(Number(newDd), maxDia);
    onChange(`${newYyyy}-${newMm.padStart(2, "0")}-${String(diaFinal).padStart(2, "0")}`);
  };

  const selectClass = "flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div className="flex gap-2">
      <select
        className={selectClass}
        value={dd || ""}
        onChange={e => update(yyyy, mm, e.target.value)}
        required={required}
      >
        <option value="">Día</option>
        {Array.from({ length: diasEnMes }, (_, i) => i + 1).map(d => (
          <option key={d} value={String(d).padStart(2, "0")}>{d}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={mm || ""}
        onChange={e => update(yyyy, e.target.value, dd)}
        required={required}
      >
        <option value="">Mes</option>
        {MESES.map((nombre, i) => (
          <option key={i} value={String(i + 1).padStart(2, "0")}>{nombre}</option>
        ))}
      </select>

      <select
        className={`${selectClass} flex-[1.4]`}
        value={yyyy || ""}
        onChange={e => update(e.target.value, mm, dd)}
        required={required}
      >
        <option value="">Año</option>
        {anios.map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  );
}
