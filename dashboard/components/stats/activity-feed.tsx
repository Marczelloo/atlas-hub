'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Database, File, Key, Settings, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  action: string;
  projectId: string | null;
  projectName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string | Date;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
  maxHeight?: string;
}

const actionIcons: Record<string, typeof Activity> = {
  'project.created': Database,
  'project.deleted': Database,
  'file.uploaded': File,
  'file.deleted': File,
  'api_key.created': Key,
  'api_key.revoked': Key,
  'user.created': User,
  'user.updated': User,
  'settings.updated': Settings,
};

const actionLabels: Record<string, string> = {
  'project.created': 'Project created',
  'project.deleted': 'Project deleted',
  'file.uploaded': 'File uploaded',
  'file.deleted': 'File deleted',
  'api_key.created': 'API key created',
  'api_key.revoked': 'API key revoked',
  'user.created': 'User registered',
  'user.updated': 'User updated',
  'settings.updated': 'Settings updated',
};

export function ActivityFeed({ items, className, maxHeight = '400px' }: ActivityFeedProps) {
  if (!items.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Activity className="mr-2 h-4 w-4" />
            <span>No recent activity</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className="space-y-4 overflow-y-auto pr-2" 
          style={{ maxHeight }}
        >
          {items.map((item, index) => {
            const Icon = actionIcons[item.action] || Activity;
            const label = actionLabels[item.action] || item.action;
            const isLast = index === items.length - 1;

            return (
              <div key={item.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {!isLast && (
                    <div className="mt-2 h-full w-px bg-border" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium">{label}</p>
                  {item.projectName && (
                    <p className="text-sm text-muted-foreground">
                      Project: {item.projectName}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
