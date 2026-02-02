import type { 
  StatsOverview, 
  ProjectStats, 
  TimelineData, 
  ActivityItem,
  Project,
  ApiKey,
} from './api';

// Generate dates for the last N days
function generateDateRange(days: number): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

// Mock overview stats
export const mockOverview: StatsOverview = {
  totalProjects: 5,
  totalUsers: 12,
  totalFiles: 247,
  totalStorageBytes: 1_547_823_104, // ~1.44 GB
  activeApiKeys: 8,
  adminUsers: 2,
  regularUsers: 10,
};

// Mock project stats
export const mockProjectStats: ProjectStats[] = [
  {
    id: 'demo-proj-1',
    name: 'E-commerce API',
    slug: 'e-commerce-api',
    createdAt: '2024-08-15T10:30:00Z',
    storageBytes: 524_288_000, // 500 MB
    fileCount: 89,
    apiKeyCount: 2,
    bucketCount: 3,
  },
  {
    id: 'demo-proj-2',
    name: 'Blog Platform',
    slug: 'blog-platform',
    createdAt: '2024-09-22T14:15:00Z',
    storageBytes: 268_435_456, // 256 MB
    fileCount: 42,
    apiKeyCount: 2,
    bucketCount: 2,
  },
  {
    id: 'demo-proj-3',
    name: 'Mobile App Backend',
    slug: 'mobile-app-backend',
    createdAt: '2024-10-05T09:00:00Z',
    storageBytes: 419_430_400, // 400 MB
    fileCount: 67,
    apiKeyCount: 2,
    bucketCount: 2,
  },
  {
    id: 'demo-proj-4',
    name: 'Analytics Dashboard',
    slug: 'analytics-dashboard',
    createdAt: '2024-11-10T16:45:00Z',
    storageBytes: 157_286_400, // 150 MB
    fileCount: 31,
    apiKeyCount: 1,
    bucketCount: 1,
  },
  {
    id: 'demo-proj-5',
    name: 'IoT Data Platform',
    slug: 'iot-data-platform',
    createdAt: '2024-12-01T11:20:00Z',
    storageBytes: 178_257_920, // ~170 MB
    fileCount: 18,
    apiKeyCount: 1,
    bucketCount: 2,
  },
];

// Generate mock timeline data
export function generateMockTimeline(days: number = 30): TimelineData[] {
  const dates = generateDateRange(days);
  return dates.map((date, index) => ({
    date,
    projects: Math.floor(Math.random() * 2) + (index % 10 === 0 ? 1 : 0),
    users: Math.floor(Math.random() * 3),
    files: Math.floor(Math.random() * 15) + 2,
  }));
}

// Mock activity items
export const mockActivity: ActivityItem[] = [
  {
    id: 'act-1',
    action: 'file.uploaded',
    projectId: 'demo-proj-1',
    projectName: 'E-commerce API',
    details: { fileName: 'product-image-42.webp' },
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
  },
  {
    id: 'act-2',
    action: 'api_key.created',
    projectId: 'demo-proj-3',
    projectName: 'Mobile App Backend',
    details: { keyType: 'publishable' },
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
  },
  {
    id: 'act-3',
    action: 'project.created',
    projectId: 'demo-proj-5',
    projectName: 'IoT Data Platform',
    details: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'act-4',
    action: 'user.created',
    projectId: null,
    projectName: null,
    details: { email: 'developer@example.com' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
  },
  {
    id: 'act-5',
    action: 'file.uploaded',
    projectId: 'demo-proj-2',
    projectName: 'Blog Platform',
    details: { fileName: 'cover-image.jpg' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
  },
  {
    id: 'act-6',
    action: 'file.deleted',
    projectId: 'demo-proj-1',
    projectName: 'E-commerce API',
    details: { fileName: 'old-banner.png' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
  {
    id: 'act-7',
    action: 'api_key.revoked',
    projectId: 'demo-proj-4',
    projectName: 'Analytics Dashboard',
    details: { reason: 'rotation' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
  },
  {
    id: 'act-8',
    action: 'user.created',
    projectId: null,
    projectName: null,
    details: { email: 'intern@example.com' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
  },
];

// Mock projects for the projects list
export const mockProjects: Project[] = mockProjectStats.map((p) => ({
  id: p.id,
  name: p.name,
  description: `Demo project: ${p.name}`,
  createdAt: p.createdAt,
  updatedAt: p.createdAt,
}));

// Mock API keys
export const mockApiKeys: ApiKey[] = [
  {
    id: 'key-1',
    projectId: 'demo-proj-1',
    keyType: 'publishable',
    keyPrefix: 'pk_demo_',
    createdAt: '2024-08-15T10:30:00Z',
    expiresAt: null,
    revokedAt: null,
  },
  {
    id: 'key-2',
    projectId: 'demo-proj-1',
    keyType: 'secret',
    keyPrefix: 'sk_demo_',
    createdAt: '2024-08-15T10:30:00Z',
    expiresAt: null,
    revokedAt: null,
  },
];

// Mock user for demo mode
export const mockDemoUser = {
  id: 'demo-user',
  email: 'demo@atlashub.dev',
  role: 'admin' as const,
  createdAt: '2024-01-01T00:00:00Z',
};

// Mock tables for SQL editor
export const mockTables = [
  { name: 'products', type: 'table' as const },
  { name: 'categories', type: 'table' as const },
  { name: 'orders', type: 'table' as const },
  { name: 'customers', type: 'table' as const },
  { name: 'product_stats', type: 'view' as const },
];

// Mock buckets
export const mockBuckets = [
  { id: 'bucket-1', name: 'uploads', createdAt: '2024-08-15T10:30:00Z' },
  { id: 'bucket-2', name: 'images', createdAt: '2024-08-15T10:30:00Z' },
  { id: 'bucket-3', name: 'documents', createdAt: '2024-09-01T14:00:00Z' },
];

// Mock files
export const mockFiles = [
  { key: 'product-image-1.webp', size: 245760, lastModified: '2024-12-01T10:00:00Z' },
  { key: 'product-image-2.webp', size: 312400, lastModified: '2024-12-01T10:05:00Z' },
  { key: 'banner.jpg', size: 524288, lastModified: '2024-11-28T08:30:00Z' },
  { key: 'logo.svg', size: 4096, lastModified: '2024-10-15T12:00:00Z' },
];

// Mock SQL execution result
export const mockSqlResult = {
  columns: ['id', 'name', 'price', 'created_at'],
  rows: [
    { id: 1, name: 'Widget Pro', price: 29.99, created_at: '2024-10-01T10:00:00Z' },
    { id: 2, name: 'Gadget Plus', price: 49.99, created_at: '2024-10-15T14:30:00Z' },
    { id: 3, name: 'Super Tool', price: 19.99, created_at: '2024-11-01T09:00:00Z' },
    { id: 4, name: 'Mega Device', price: 99.99, created_at: '2024-11-20T16:45:00Z' },
    { id: 5, name: 'Ultra Accessory', price: 14.99, created_at: '2024-12-01T11:00:00Z' },
  ],
  rowCount: 5,
  executionTimeMs: 12,
};
