'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ProjectStorage {
  name: string;
  storageBytes: number;
  fileCount: number;
}

interface StorageChartProps {
  projects: ProjectStorage[];
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function StorageChart({ projects, className }: StorageChartProps) {
  const data = projects.map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name,
    fullName: p.name,
    storage: p.storageBytes,
    files: p.fileCount,
  }));

  const totalStorage = projects.reduce((sum, p) => sum + p.storageBytes, 0);

  if (!projects.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Storage by Project</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No projects with storage data
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Storage by Project</CardTitle>
        <span className="text-sm text-muted-foreground">
          Total: {formatBytes(totalStorage)}
        </span>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--muted))' }}
                axisLine={{ stroke: 'hsl(var(--muted))' }}
              />
              <YAxis
                tickFormatter={(value) => formatBytes(value)}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--muted))' }}
                axisLine={{ stroke: 'hsl(var(--muted))' }}
                width={60}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-md">
                        <p className="font-medium">{data.fullName}</p>
                        <p className="text-sm text-muted-foreground">
                          Storage: {formatBytes(data.storage)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Files: {data.files}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="storage" radius={[4, 4, 0, 0]}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
