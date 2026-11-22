'use client';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { money } from '@/domain/finance';
const palette = ['#059669', '#55b89d', '#90cfbb', '#b7e2d4', '#527e72', '#d5eee5'];
export function FlowChart({
  data,
  hidden = false,
  projection = false,
  lineLabel = 'Saldo projetado',
}: {
  data: { name: string; income: number; expense: number; balance?: number }[];
  hidden?: boolean;
  projection?: boolean;
  lineLabel?: string;
}) {
  return (
    <div className="flow-chart" aria-label="Gráfico financeiro">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#059669" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            dy={12}
          />
          <YAxis
            tickFormatter={(v) => (hidden ? '•••' : `${Number(v) / 100000} mil`)}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: 'var(--muted)' }}
            width={55}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              fontSize: 13,
            }}
            formatter={(v) => money(Number(v), hidden)}
          />
          <Area
            type="monotone"
            dataKey={projection ? 'balance' : 'income'}
            name={projection ? lineLabel : 'Receitas'}
            stroke="#059669"
            fill="url(#incomeFill)"
            strokeWidth={2.5}
          />
          {!projection && (
            <Area
              type="monotone"
              dataKey="expense"
              name="Despesas"
              stroke="#9ba8b2"
              fill="transparent"
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export function CategoryChart({
  data,
  hidden,
  centerLabel = 'Total do mês',
}: {
  data: { name: string; value: number }[];
  hidden: boolean;
  centerLabel?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="category-chart">
      <div className="donut">
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie
              data={total ? data : [{ name: 'Sem despesas', value: 1 }]}
              dataKey="value"
              innerRadius={62}
              outerRadius={83}
              paddingAngle={total ? 4 : 0}
              stroke="none"
            >
              {(total ? data : [{ name: 'Sem despesas', value: 1 }]).map((d, i) => (
                <Cell key={d.name} fill={total ? palette[i % palette.length] : 'var(--border)'} />
              ))}
            </Pie>
            {total > 0 && <Tooltip formatter={(v) => money(Number(v), hidden)} />}
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center">
          <small>{centerLabel}</small>
          <strong>{money(total, hidden)}</strong>
        </div>
      </div>
      <div className="category-legend">
        {data.length ? (
          data.map((d, i) => (
            <div key={d.name}>
              <span className="legend-label">
                <i style={{ background: palette[i % palette.length] }} />
                {d.name}
              </span>
              <strong>{Math.round((d.value / total) * 100)}%</strong>
            </div>
          ))
        ) : (
          <p className="muted centered">
            As categorias aparecerão após
            <br />
            seu primeiro lançamento.
          </p>
        )}
      </div>
    </div>
  );
}
