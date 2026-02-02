'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface TimelineData {
  date: string;
  projects: number;
  users: number;
  files: number;
}

interface TimelineChartProps {
  data: TimelineData[];
  className?: string;
}

export function TimelineChart({ data, className }: TimelineChartProps) {
  if (!data.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-75 items-center justify-center text-muted-foreground">
            No timeline data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    dateLabel: format(parseISO(d.date), 'MMM d'),
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Activity Timeline (30 days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-75">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={formattedData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorFiles" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={{ stroke: 'hsl(var(--muted))' }}
                axisLine={{ stroke: 'hsl(var(--muted))' }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={{ stroke: 'hsl(var(--muted))' }}
                axisLine={{ stroke: 'hsl(var(--muted))' }}
                width={30}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md">
                        <p className="mb-1 font-medium">{label}</p>
                        {payload.map((entry, index) => (
                          <p
                            key={index}
                            className="text-sm"
                            style={{ color: entry.color }}
                          >
                            {entry.name}: {entry.value}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
              <Area
                type="monotone"
                dataKey="projects"
                name="Projects"
                stroke="hsl(var(--chart-1))"
                fill="url(#colorProjects)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="users"
                name="Users"
                stroke="hsl(var(--chart-2))"
                fill="url(#colorUsers)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="files"
                name="Files"
                stroke="hsl(var(--chart-3))"
                fill="url(#colorFiles)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
