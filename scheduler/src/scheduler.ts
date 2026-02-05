import pg from 'pg';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { Cron } from 'croner';
import pino from 'pino';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { config } from './config.js';

const { Pool } = pg;

const logger = pino({
  level: config.logLevel,
  transport:
    config.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

// Database connection pool
const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.database,
  user: config.postgres.user,
  password: config.postgres.password,
  max: config.postgres.maxPoolSize,
});

// S3 client for backups
const s3Client = new S3Client({
  endpoint: `http${config.minio.useSSL ? 's' : ''}://${config.minio.endpoint}:${config.minio.port}`,
  region: config.minio.region,
  credentials: {
    accessKeyId: config.minio.accessKey,
    secretAccessKey: config.minio.secretKey,
  },
  forcePathStyle: true,
});

const BACKUP_BUCKET = 'atlashub-backups';

// Track active cron instances
const activeCrons = new Map<string, Cron>();
// Track running jobs to respect concurrency limit
let runningJobs = 0;

/**
 * Decrypt job data (headers or body) using AES-256-GCM
 */
function decryptJobData<T = unknown>(
  encryptedData: string | null,
  iv: string | null,
  authTag: string | null
): T | null {
  if (!encryptedData || !iv || !authTag || !config.platformMasterKey) {
    return null;
  }

  try {
    // Derive a 32-byte key from the master key
    const key = crypto.createHash('sha256').update(config.platformMasterKey).digest();

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as T;
  } catch (err) {
    logger.error({ err }, 'Failed to decrypt job data');
    return null;
  }
}

export interface CronJob {
  id: string;
  projectId: string | null;
  name: string;
  jobType: 'http' | 'platform';
  scheduleCron: string;
  timezone: string;
  httpUrl: string | null;
  httpMethod: string | null;
  httpHeaders: Record<string, string> | null;
  httpBody: unknown | null;
  platformAction: string | null;
  platformConfig: Record<string, unknown> | null;
  enabled: boolean;
  timeoutMs: number;
  retries: number;
  retryBackoffMs: number;
}

// Raw database row type (before decryption)
interface CronJobRow {
  id: string;
  projectId: string | null;
  name: string;
  jobType: 'http' | 'platform';
  scheduleCron: string;
  timezone: string;
  httpUrl: string | null;
  httpMethod: string | null;
  httpHeadersEncrypted: string | null;
  httpBodyEncrypted: string | null;
  headersIv: string | null;
  headersAuthTag: string | null;
  bodyIv: string | null;
  bodyAuthTag: string | null;
  platformAction: string | null;
  platformConfig: Record<string, unknown> | null;
  enabled: boolean;
  timeoutMs: number;
  retries: number;
  retryBackoffMs: number;
}

/**
 * Load all enabled cron jobs from the database
 */
async function loadEnabledJobs(): Promise<CronJob[]> {
  const result = await pool.query<CronJobRow>(`
    SELECT 
      id, project_id as "projectId", name, job_type as "jobType",
      schedule_cron as "scheduleCron", timezone,
      http_url as "httpUrl", http_method as "httpMethod",
      http_headers_encrypted as "httpHeadersEncrypted", 
      http_body_encrypted as "httpBodyEncrypted",
      headers_iv as "headersIv", headers_auth_tag as "headersAuthTag",
      body_iv as "bodyIv", body_auth_tag as "bodyAuthTag",
      platform_action as "platformAction", platform_config as "platformConfig",
      enabled, timeout_ms as "timeoutMs", retries,
      retry_backoff_ms as "retryBackoffMs"
    FROM cron_jobs
    WHERE enabled = true
  `);

  // Decrypt headers and body for each job
  return result.rows.map(
    (row): CronJob => ({
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      jobType: row.jobType,
      scheduleCron: row.scheduleCron,
      timezone: row.timezone,
      httpUrl: row.httpUrl,
      httpMethod: row.httpMethod,
      httpHeaders: decryptJobData<Record<string, string>>(
        row.httpHeadersEncrypted,
        row.headersIv,
        row.headersAuthTag
      ),
      httpBody: decryptJobData(row.httpBodyEncrypted, row.bodyIv, row.bodyAuthTag),
      platformAction: row.platformAction,
      platformConfig: row.platformConfig,
      enabled: row.enabled,
      timeoutMs: row.timeoutMs,
      retries: row.retries,
      retryBackoffMs: row.retryBackoffMs,
    })
  );
}

/**
 * Record a job run in the database
 */
async function createJobRun(jobId: string, attemptNumber: number): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO cron_job_runs (job_id, started_at, status, attempt_number)
     VALUES ($1, NOW(), 'running', $2)
     RETURNING id`,
    [jobId, attemptNumber]
  );
  return result.rows[0].id;
}

/**
 * Update a job run with the result
 */
async function updateJobRun(
  runId: string,
  status: 'success' | 'fail' | 'timeout',
  httpStatus: number | null,
  errorText: string | null,
  logPreview: string | null
): Promise<void> {
  await pool.query(
    `UPDATE cron_job_runs
     SET 
       finished_at = NOW(),
       duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
       status = $2,
       http_status = $3,
       error_text = $4,
       log_preview = $5
     WHERE id = $1`,
    [runId, status, httpStatus, errorText, logPreview]
  );
}

/**
 * Update last_run_at and next_run_at for a job
 */
async function updateJobTimestamps(jobId: string, nextRun: Date | null): Promise<void> {
  await pool.query(
    `UPDATE cron_jobs 
     SET last_run_at = NOW(), next_run_at = $2, updated_at = NOW()
     WHERE id = $1`,
    [jobId, nextRun]
  );
}

/**
 * Execute an HTTP job
 */
async function executeHttpJob(job: CronJob): Promise<{
  success: boolean;
  httpStatus: number | null;
  error: string | null;
  responsePreview: string | null;
}> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    job.timeoutMs || config.scheduler.defaultTimeoutMs
  );

  try {
    const response = await fetch(job.httpUrl!, {
      method: job.httpMethod || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AtlasHub-Scheduler/1.0',
        ...(job.httpHeaders || {}),
      },
      body: job.httpBody ? JSON.stringify(job.httpBody) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseText = await response.text().catch(() => '');
    const preview = responseText.slice(0, 500);

    return {
      success: response.ok,
      httpStatus: response.status,
      error: response.ok ? null : `HTTP ${response.status}: ${preview}`,
      responsePreview: preview,
    };
  } catch (err) {
    clearTimeout(timeout);
    const error = err instanceof Error ? err.message : String(err);
    const isTimeout = error.includes('abort') || error.includes('timeout');
    return {
      success: false,
      httpStatus: null,
      error: isTimeout ? 'Request timed out' : error,
      responsePreview: null,
    };
  }
}

/**
 * Decrypt credentials for project database
 */
function decryptCredentials(encryptedData: string, iv: string, authTag: string): string {
  if (!config.platformMasterKey) {
    throw new Error('PLATFORM_MASTER_KEY not configured');
  }
  const key = crypto.createHash('sha256').update(config.platformMasterKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Run pg_dump and return output as buffer
 */
async function runPgDump(connectionString: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = ['-d', connectionString, '--no-owner', '--no-acl', '-Fc'];
    const proc = spawn('pg_dump', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: string[] = [];

    proc.stdout.on('data', (data) => stdoutChunks.push(data));
    proc.stderr.on('data', (data) => stderrChunks.push(data.toString()));

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(Buffer.concat(stdoutChunks));
      } else {
        reject(new Error(`pg_dump exited with code ${code}: ${stderrChunks.join('')}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn pg_dump: ${err.message}`));
    });
  });
}

/**
 * Ensure backup bucket exists
 */
async function ensureBackupBucket(): Promise<void> {
  try {
    await s3Client.send(new ListObjectsV2Command({ Bucket: BACKUP_BUCKET, MaxKeys: 1 }));
  } catch (error: unknown) {
    if ((error as { name?: string }).name === 'NoSuchBucket') {
      await s3Client.send(new CreateBucketCommand({ Bucket: BACKUP_BUCKET }));
    } else {
      throw error;
    }
  }
}

/**
 * Create a project database backup
 */
async function backupProjectDatabase(
  projectId: string
): Promise<{ backupId: string; sizeBytes: number }> {
  // Get project credentials
  const credsResult = await pool.query<{
    encrypted_connection_string: string;
    iv: string;
    auth_tag: string;
  }>(
    `SELECT encrypted_connection_string, iv, auth_tag FROM project_db_creds
     WHERE project_id = $1 AND role = 'owner'`,
    [projectId]
  );

  if (credsResult.rows.length === 0) {
    throw new Error(`Project credentials not found for ${projectId}`);
  }

  const connStr = decryptCredentials(
    credsResult.rows[0].encrypted_connection_string,
    credsResult.rows[0].iv,
    credsResult.rows[0].auth_tag
  );

  // Create backup record
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const objectKey = `projects/${projectId}/auto_${timestamp}.sql`;

  const insertResult = await pool.query<{ id: string }>(
    `INSERT INTO backups (project_id, backup_type, object_key, format, status, created_by)
     VALUES ($1, 'project', $2, 'sql', 'running', 'scheduler')
     RETURNING id`,
    [projectId, objectKey]
  );
  const backupId = insertResult.rows[0].id;

  try {
    await ensureBackupBucket();

    // Run pg_dump
    const data = await runPgDump(connStr);

    // Upload to MinIO
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BACKUP_BUCKET,
        Key: objectKey,
        Body: data,
        ContentType: 'application/octet-stream',
      })
    );

    // Update backup record
    await pool.query(
      `UPDATE backups SET status = 'completed', size_bytes = $2, completed_at = NOW() WHERE id = $1`,
      [backupId, data.length]
    );

    return { backupId, sizeBytes: data.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await pool.query(`UPDATE backups SET status = 'failed', error_message = $2 WHERE id = $1`, [
      backupId,
      message,
    ]);
    throw error;
  }
}

/**
 * Apply smart retention policy for backups
 * Keeps: all backups from last 3 days, 1/week for prev week, 1/2weeks before that
 */
async function applyBackupRetention(
  projectId?: string | null
): Promise<{ deleted: number; kept: number }> {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Build query based on whether we're filtering by project
  let whereClause = "backup_type = 'project' AND status = 'completed'";
  const params: unknown[] = [];

  if (projectId) {
    whereClause += ` AND project_id = $1`;
    params.push(projectId);
  }

  // Get all completed project backups ordered by date
  const result = await pool.query<{
    id: string;
    project_id: string;
    object_key: string;
    created_at: Date;
  }>(
    `SELECT id, project_id, object_key, created_at FROM backups
     WHERE ${whereClause}
     ORDER BY project_id, created_at DESC`,
    params
  );

  // Group by project
  const backupsByProject = new Map<string, typeof result.rows>();
  for (const row of result.rows) {
    const pid = row.project_id;
    if (!backupsByProject.has(pid)) {
      backupsByProject.set(pid, []);
    }
    backupsByProject.get(pid)!.push(row);
  }

  const toDelete: string[] = [];
  const toDeleteKeys: string[] = [];

  for (const [, backups] of backupsByProject) {
    // Keep all from last 3 days
    const recent = backups.filter((b) => b.created_at >= threeDaysAgo);

    // From last week (but not last 3 days), keep only the newest
    const lastWeek = backups.filter(
      (b) => b.created_at < threeDaysAgo && b.created_at >= oneWeekAgo
    );
    const keepFromLastWeek = lastWeek.length > 0 ? [lastWeek[0]] : [];
    const deleteFromLastWeek = lastWeek.slice(1);

    // From 1-2 weeks ago, keep only the newest
    const prevWeek = backups.filter(
      (b) => b.created_at < oneWeekAgo && b.created_at >= twoWeeksAgo
    );
    const keepFromPrevWeek = prevWeek.length > 0 ? [prevWeek[0]] : [];
    const deleteFromPrevWeek = prevWeek.slice(1);

    // Older than 2 weeks - delete all
    const older = backups.filter((b) => b.created_at < twoWeeksAgo);

    // Mark for deletion
    for (const b of [...deleteFromLastWeek, ...deleteFromPrevWeek, ...older]) {
      toDelete.push(b.id);
      toDeleteKeys.push(b.object_key);
    }

    logger.debug(
      {
        projectId: backups[0]?.project_id,
        keeping: recent.length + keepFromLastWeek.length + keepFromPrevWeek.length,
        deleting: toDelete.length,
      },
      'Retention policy applied'
    );
  }

  // Delete from MinIO
  for (const key of toDeleteKeys) {
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: BACKUP_BUCKET, Key: key }));
    } catch {
      // Ignore errors - file might already be gone
    }
  }

  // Delete from database
  if (toDelete.length > 0) {
    await pool.query(`DELETE FROM backups WHERE id = ANY($1::uuid[])`, [toDelete]);
  }

  return {
    deleted: toDelete.length,
    kept: result.rows.length - toDelete.length,
  };
}

/**
 * Execute a platform job (internal actions like backup)
 */
async function executePlatformJob(job: CronJob): Promise<{
  success: boolean;
  error: string | null;
  responsePreview: string | null;
}> {
  const action = job.platformAction;
  const jobConfig = job.platformConfig || {};
  logger.info({ jobId: job.id, action, config: jobConfig }, 'Executing platform job');

  try {
    switch (action) {
      case 'backup_project': {
        // Backup a specific project (projectId from job or config)
        const projectId = job.projectId || (jobConfig.projectId as string);
        if (!projectId) {
          return { success: false, error: 'No projectId specified', responsePreview: null };
        }
        const result = await backupProjectDatabase(projectId);
        return {
          success: true,
          error: null,
          responsePreview: `Backup created: ${result.backupId} (${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB)`,
        };
      }

      case 'backup_all_projects': {
        // Backup all projects
        const projectsResult = await pool.query<{ id: string; name: string }>(
          'SELECT id, name FROM projects'
        );
        const results: string[] = [];
        let errors = 0;

        for (const project of projectsResult.rows) {
          try {
            const result = await backupProjectDatabase(project.id);
            results.push(`${project.name}: OK (${(result.sizeBytes / 1024 / 1024).toFixed(2)} MB)`);
          } catch (err) {
            errors++;
            const msg = err instanceof Error ? err.message : 'Unknown error';
            results.push(`${project.name}: FAILED - ${msg}`);
            logger.error({ projectId: project.id, err }, 'Failed to backup project');
          }
        }

        return {
          success: errors === 0,
          error: errors > 0 ? `${errors} backup(s) failed` : null,
          responsePreview: `Backed up ${projectsResult.rows.length} projects:\n${results.join('\n')}`,
        };
      }

      case 'cleanup_backups_with_retention': {
        // Apply retention policy
        const projectId = job.projectId || (jobConfig.projectId as string | null);
        const result = await applyBackupRetention(projectId);
        return {
          success: true,
          error: null,
          responsePreview: `Retention applied: ${result.deleted} deleted, ${result.kept} kept`,
        };
      }

      case 'cleanup_expired_backups': {
        // Legacy: just cleanup by expires_at
        const result = await pool.query<{ id: string; object_key: string }>(
          `SELECT id, object_key FROM backups WHERE expires_at IS NOT NULL AND expires_at < NOW()`
        );

        for (const row of result.rows) {
          try {
            await s3Client.send(
              new DeleteObjectCommand({ Bucket: BACKUP_BUCKET, Key: row.object_key })
            );
          } catch {
            // Ignore
          }
        }

        await pool.query(`DELETE FROM backups WHERE expires_at IS NOT NULL AND expires_at < NOW()`);
        return {
          success: true,
          error: null,
          responsePreview: `Cleaned up ${result.rows.length} expired backups`,
        };
      }

      case 'vacuum_database': {
        // Run VACUUM on project databases
        const projectsResult = await pool.query<{ id: string }>('SELECT id FROM projects');
        let vacuumed = 0;
        let errors = 0;

        for (const project of projectsResult.rows) {
          try {
            const credsResult = await pool.query<{
              encrypted_connection_string: string;
              iv: string;
              auth_tag: string;
            }>(
              `SELECT encrypted_connection_string, iv, auth_tag FROM project_db_creds
               WHERE project_id = $1 AND role = 'owner'`,
              [project.id]
            );

            if (credsResult.rows.length > 0) {
              const connStr = decryptCredentials(
                credsResult.rows[0].encrypted_connection_string,
                credsResult.rows[0].iv,
                credsResult.rows[0].auth_tag
              );

              const projectPool = new Pool({ connectionString: connStr, max: 1 });
              await projectPool.query('VACUUM ANALYZE');
              await projectPool.end();
              vacuumed++;
            }
          } catch (err) {
            errors++;
            logger.error({ projectId: project.id, err }, 'Failed to vacuum project DB');
          }
        }

        return {
          success: errors === 0,
          error: errors > 0 ? `${errors} vacuum(s) failed` : null,
          responsePreview: `Vacuumed ${vacuumed} databases, ${errors} errors`,
        };
      }

      case 'notify_status': {
        if (config.discord.enabled) {
          await sendDiscordNotification({
            title: '🟢 AtlasHub Status',
            description: 'Scheduler is running normally.',
            color: 0x00ff00,
          });
        }
        return { success: true, error: null, responsePreview: 'Status notification sent' };
      }

      default:
        return {
          success: false,
          error: `Unknown platform action: ${action}`,
          responsePreview: null,
        };
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    logger.error({ jobId: job.id, action, err }, 'Platform job failed');
    return { success: false, error, responsePreview: null };
  }
}

/**
 * Send a Discord notification
 */
async function sendDiscordNotification(embed: {
  title: string;
  description: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}): Promise<void> {
  if (!config.discord.enabled) return;

  try {
    await fetch(config.discord.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            ...embed,
            timestamp: new Date().toISOString(),
            footer: { text: 'AtlasHub Scheduler' },
          },
        ],
      }),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to send Discord notification');
  }
}

/**
 * Execute a job with retries
 */
async function executeJobWithRetries(job: CronJob): Promise<void> {
  if (runningJobs >= config.scheduler.maxConcurrentJobs) {
    logger.warn({ jobId: job.id, jobName: job.name }, 'Skipping job: max concurrent jobs reached');
    return;
  }

  runningJobs++;
  logger.info({ jobId: job.id, jobName: job.name, jobType: job.jobType }, 'Executing job');

  let lastError: string | null = null;
  let success = false;

  for (let attempt = 1; attempt <= Math.max(1, job.retries + 1); attempt++) {
    const runId = await createJobRun(job.id, attempt);

    try {
      let result: {
        success: boolean;
        httpStatus?: number | null;
        error: string | null;
        responsePreview: string | null;
      };

      if (job.jobType === 'http') {
        result = await executeHttpJob(job);
      } else {
        result = await executePlatformJob(job);
      }

      await updateJobRun(
        runId,
        result.success ? 'success' : 'fail',
        result.httpStatus ?? null,
        result.error,
        result.responsePreview
      );

      if (result.success) {
        success = true;
        logger.info({ jobId: job.id, jobName: job.name, attempt }, 'Job completed successfully');
        break;
      }

      lastError = result.error;
      logger.warn({ jobId: job.id, jobName: job.name, attempt, error: result.error }, 'Job failed');

      // Wait before retry
      if (attempt < job.retries + 1 && job.retryBackoffMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, job.retryBackoffMs));
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      await updateJobRun(runId, 'fail', null, lastError, null);
      logger.error({ jobId: job.id, jobName: job.name, attempt, err }, 'Job execution error');
    }
  }

  // Update job timestamps
  const cronInstance = activeCrons.get(job.id);
  const nextRun = cronInstance?.nextRun() ?? null;
  await updateJobTimestamps(job.id, nextRun);

  // Send failure notification
  if (!success && config.discord.enabled) {
    await sendDiscordNotification({
      title: '🔴 Cron Job Failed',
      description: `Job **${job.name}** failed after ${job.retries + 1} attempts.`,
      color: 0xff0000,
      fields: [
        { name: 'Job ID', value: job.id, inline: true },
        { name: 'Type', value: job.jobType, inline: true },
        { name: 'Error', value: lastError?.slice(0, 200) || 'Unknown error' },
      ],
    });
  }

  runningJobs--;
}

/**
 * Schedule a single job
 */
function scheduleJob(job: CronJob): void {
  // Stop existing cron if any
  const existing = activeCrons.get(job.id);
  if (existing) {
    existing.stop();
  }

  try {
    const cron = new Cron(job.scheduleCron, { timezone: job.timezone }, () => {
      executeJobWithRetries(job).catch((err) => {
        logger.error({ jobId: job.id, err }, 'Unhandled error in job execution');
      });
    });

    activeCrons.set(job.id, cron);

    const nextRun = cron.nextRun();
    logger.info(
      { jobId: job.id, jobName: job.name, schedule: job.scheduleCron, nextRun },
      'Job scheduled'
    );

    // Update next_run_at in database
    pool
      .query('UPDATE cron_jobs SET next_run_at = $1 WHERE id = $2', [nextRun, job.id])
      .catch((updateErr: Error) => {
        logger.error({ err: updateErr, jobId: job.id }, 'Failed to update next_run_at');
      });
  } catch (err) {
    logger.error({ jobId: job.id, jobName: job.name, err }, 'Failed to schedule job');
  }
}

/**
 * Sync jobs from database (add new, remove deleted, update changed)
 */
async function syncJobs(): Promise<void> {
  try {
    const jobs = await loadEnabledJobs();
    const jobIds = new Set(jobs.map((j) => j.id));

    // Remove jobs that are no longer enabled or deleted
    for (const [id, cron] of activeCrons) {
      if (!jobIds.has(id)) {
        cron.stop();
        activeCrons.delete(id);
        logger.info({ jobId: id }, 'Job removed from schedule');
      }
    }

    // Add or update jobs
    for (const job of jobs) {
      scheduleJob(job);
    }

    logger.debug({ activeJobs: activeCrons.size }, 'Jobs synced');
  } catch (err) {
    logger.error({ err }, 'Failed to sync jobs');
  }
}

/**
 * Start the scheduler
 */
export async function startScheduler(): Promise<void> {
  logger.info('Starting AtlasHub Scheduler...');

  // Initial sync
  await syncJobs();

  // Periodically sync jobs (to pick up changes)
  setInterval(() => {
    syncJobs().catch((err) => {
      logger.error({ err }, 'Failed to sync jobs');
    });
  }, config.scheduler.pollIntervalMs);

  // Send startup notification
  if (config.discord.enabled) {
    await sendDiscordNotification({
      title: '🟢 Scheduler Started',
      description: 'AtlasHub Scheduler is now running.',
      color: 0x00ff00,
      fields: [{ name: 'Active Jobs', value: String(activeCrons.size), inline: true }],
    });
  }

  logger.info({ activeJobs: activeCrons.size }, 'Scheduler started');
}

/**
 * Stop the scheduler gracefully
 */
export async function stopScheduler(): Promise<void> {
  logger.info('Stopping scheduler...');

  // Stop all cron jobs
  for (const [id, cron] of activeCrons) {
    cron.stop();
    logger.debug({ jobId: id }, 'Stopped cron job');
  }
  activeCrons.clear();

  // Close database pool
  await pool.end();

  // Send shutdown notification
  if (config.discord.enabled) {
    await sendDiscordNotification({
      title: '🔴 Scheduler Stopped',
      description: 'AtlasHub Scheduler has been stopped.',
      color: 0xff9900,
    });
  }

  logger.info('Scheduler stopped');
}
