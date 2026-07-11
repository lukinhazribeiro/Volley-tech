"use client"

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const AXIS = "var(--color-muted-foreground)"

function TooltipBox({ active, payload, label, suffix = "" }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-semibold text-popover-foreground">{label}</p>}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.payload?.fill }}>
          {p.name}: <span className="font-bold">{p.value}{suffix}</span>
        </p>
      ))}
    </div>
  )
}

export function PresencasSemanaChart({ data }: { data: { dia: string; percentual: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={230} initialDimension={{ width: 500, height: 230 }}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="presGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="dia" stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} />
        <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<TooltipBox suffix="%" />} cursor={{ stroke: "var(--color-primary)", strokeDasharray: 4 }} />
        <Area
          type="monotone"
          dataKey="percentual"
          name="Presença"
          stroke="var(--color-primary)"
          strokeWidth={2.5}
          fill="url(#presGrad)"
          dot={{ r: 4, fill: "var(--color-primary)", strokeWidth: 0 }}
          activeDot={{ r: 6 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function ReceitaDonut({ recebida, pendente }: { recebida: number; pendente: number }) {
  const total = recebida + pendente
  const data = [
    { name: "Recebida", value: recebida, fill: "var(--color-success)" },
    { name: "Pendências", value: pendente, fill: "var(--color-primary)" },
  ]
  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return (
    <div className="relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height={230} initialDimension={{ width: 300, height: 230 }}>
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={70} outerRadius={95} paddingAngle={3} strokeWidth={0}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-xl font-extrabold">R$ {fmt(total)}</span>
      </div>
    </div>
  )
}

export function CategoriaDonut({ data }: { data: { nome: string; total: number }[] }) {
  const palette = [
    "var(--color-primary)",
    "var(--color-success)",
    "var(--color-info)",
    "var(--color-chart-5)",
    "var(--color-destructive)",
  ]
  const total = data.reduce((s, d) => s + d.total, 0)
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={180} initialDimension={{ width: 300, height: 180 }}>
        <PieChart>
          <Pie data={data} dataKey="total" nameKey="nome" innerRadius={50} outerRadius={72} paddingAngle={2} strokeWidth={0}>
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-extrabold">{total}</span>
        <span className="text-[10px] text-muted-foreground">Total</span>
      </div>
    </div>
  )
}

export function AnaliseCombinada({
  receita,
  frequencia,
  inadimplencia,
}: {
  receita: { mes: string; recebido: number }[]
  frequencia: { mes: string; valor: number }[]
  inadimplencia: { mes: string; valor: number }[]
}) {
  // Junta as três séries por mês
  const mapa = new Map<string, { mes: string; recebido: number; frequencia: number; inadimplencia: number }>()
  for (const r of receita) mapa.set(r.mes, { mes: r.mes, recebido: r.recebido, frequencia: 0, inadimplencia: 0 })
  for (const f of frequencia) {
    const cur = mapa.get(f.mes) ?? { mes: f.mes, recebido: 0, frequencia: 0, inadimplencia: 0 }
    cur.frequencia = f.valor
    mapa.set(f.mes, cur)
  }
  for (const i of inadimplencia) {
    const cur = mapa.get(i.mes) ?? { mes: i.mes, recebido: 0, frequencia: 0, inadimplencia: 0 }
    cur.inadimplencia = i.valor
    mapa.set(i.mes, cur)
  }
  const data = Array.from(mapa.values())

  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Os gráficos aparecem conforme você registra pagamentos e check-ins
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320} initialDimension={{ width: 700, height: 320 }}>
      <ComposedChart data={data} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.95} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.55} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="mes" stroke={AXIS} tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          yAxisId="left"
          stroke={AXIS}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          stroke={AXIS}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip content={<CombinadoTooltip />} cursor={{ fill: "var(--color-muted)", opacity: 0.25 }} />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="circle"
          wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }}
        />
        <Bar yAxisId="left" dataKey="recebido" name="Receita (R$)" fill="url(#recGrad)" radius={[5, 5, 0, 0]} barSize={26} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="frequencia"
          name="Frequência (%)"
          stroke="var(--color-success)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "var(--color-success)" }}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="inadimplencia"
          name="Inadimplência (%)"
          stroke="var(--color-destructive)"
          strokeWidth={2.5}
          strokeDasharray="5 4"
          dot={{ r: 3, fill: "var(--color-destructive)" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function CombinadoTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold text-popover-foreground">{label}</p>
      {payload.map((p: any, i: number) => {
        const isMoney = p.dataKey === "recebido"
        const val = isMoney
          ? `R$ ${Number(p.value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `${p.value}%`
        return (
          <p key={i} style={{ color: p.color || p.payload?.fill }}>
            {p.name}: <span className="font-bold">{val}</span>
          </p>
        )
      })}
    </div>
  )
}

export function MiniBar({ data }: { data: { mes: string; recebido: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={140} initialDimension={{ width: 300, height: 140 }}>
      <BarChart data={data} margin={{ top: 6, right: 4, left: -24, bottom: 0 }}>
        <XAxis dataKey="mes" stroke={AXIS} tickLine={false} axisLine={false} fontSize={10} />
        <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={10} width={40} />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--color-muted)", opacity: 0.3 }} />
        <Bar dataKey="recebido" name="Receita" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MiniLine({
  data,
  color,
  suffix = "%",
}: {
  data: { mes: string; valor: number }[]
  color: string
  suffix?: string
}) {
  return (
    <ResponsiveContainer width="100%" height={140} initialDimension={{ width: 300, height: 140 }}>
      <LineChart data={data} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
        <XAxis dataKey="mes" stroke={AXIS} tickLine={false} axisLine={false} fontSize={10} />
        <YAxis stroke={AXIS} tickLine={false} axisLine={false} fontSize={10} width={40} tickFormatter={(v) => `${v}`} />
        <Tooltip content={<TooltipBox suffix={suffix} />} cursor={{ stroke: color, strokeDasharray: 4 }} />
        <Line type="monotone" dataKey="valor" name="Valor" stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
