/**
 * Runtime settings store for dynamically adjustable configuration.
 * These settings can be modified without restarting the server.
 */

export interface RuntimeSettings {
  rateLimitMax: number;
  rateLimitWindowMs: number;
  sqlMaxRows: number;
  sqlStatementTimeoutMs: number;
  minioPublicUrl: string;
}

// Initial values from environment (will be set during app startup)
let settings: RuntimeSettings = {
  rateLimitMax: 100,
  rateLimitWindowMs: 60000,
  sqlMaxRows: 1000,
  sqlStatementTimeoutMs: 5000,
  minioPublicUrl: 'http://localhost:9100',
};

export const runtimeSettings = {
  /**
   * Initialize settings from config
   */
  init(initialSettings: RuntimeSettings): void {
    settings = { ...initialSettings };
  },

  /**
   * Get current settings
   */
  get(): RuntimeSettings {
    return { ...settings };
  },

  /**
   * Update rate limit settings
   */
  updateRateLimits(rateLimitMax: number, rateLimitWindowMs: number): void {
    if (rateLimitMax > 0) {
      settings.rateLimitMax = rateLimitMax;
    }
    if (rateLimitWindowMs > 0) {
      settings.rateLimitWindowMs = rateLimitWindowMs;
    }
  },

  /**
   * Update database limit settings
   */
  updateDbLimits(sqlMaxRows: number, sqlStatementTimeoutMs: number): void {
    if (sqlMaxRows > 0) {
      settings.sqlMaxRows = sqlMaxRows;
    }
    if (sqlStatementTimeoutMs > 0) {
      settings.sqlStatementTimeoutMs = sqlStatementTimeoutMs;
    }
  },

  /**
   * Update storage settings
   */
  updateStorageSettings(minioPublicUrl: string): void {
    if (minioPublicUrl) {
      settings.minioPublicUrl = minioPublicUrl;
    }
  },

  /**
   * Get current rate limit max
   */
  getRateLimitMax(): number {
    return settings.rateLimitMax;
  },

  /**
   * Get current rate limit window
   */
  getRateLimitWindowMs(): number {
    return settings.rateLimitWindowMs;
  },

  /**
   * Get current SQL max rows
   */
  getSqlMaxRows(): number {
    return settings.sqlMaxRows;
  },

  /**
   * Get current SQL statement timeout
   */
  getSqlStatementTimeoutMs(): number {
    return settings.sqlStatementTimeoutMs;
  },

  /**
   * Get current MinIO public URL
   */
  getMinioPublicUrl(): string {
    return settings.minioPublicUrl;
  },
};
