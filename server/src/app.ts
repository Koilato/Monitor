import express, { type NextFunction, type Request, type Response } from 'express';
import { createServerRuntime, type ServerRuntime } from './runtime.js';
import {
  ValidationError,
  assertDateRange,
  normalizeCountryCode,
  normalizeDate,
  normalizeOptionalCountryCode,
  normalizePositiveInt,
  normalizeSeverity,
  normalizeSortOrder,
} from './validation.js';

export interface CreateAppOptions {
  runtime?: ServerRuntime;
  dbPath?: string;
}

function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null && 'error' in payload) {
    const errorRecord = payload as { error?: { message?: string } | string };
    if (typeof errorRecord.error === 'string') {
      return errorRecord.error;
    }
    if (typeof errorRecord.error?.message === 'string') {
      return errorRecord.error.message;
    }
  }
  return fallback;
}

export function createApp(options: CreateAppOptions = {}) {
  const runtime = options.runtime ?? createServerRuntime({ path: options.dbPath });
  const app = express();

  app.use(express.json({ limit: '2mb' }));
  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  app.get('/api/v1/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/v1/map/countries/:countryCode', (req, res) => {
    const victimCountry = normalizeCountryCode(req.params.countryCode, 'countryCode');
    const startDate = normalizeDate(req.query.startDate, 'startDate');
    const endDate = normalizeDate(req.query.endDate, 'endDate');
    assertDateRange(startDate, endDate);

    res.json(runtime.computeService.getCountryHoverDetail({
      victimCountry,
      startDate,
      endDate,
    }));
  });

  app.get('/api/v1/intel/feed', (req, res) => {
    const sort = normalizeSortOrder(req.query.sort, 'sort', 'desc');
    const limit = normalizePositiveInt(req.query.limit, 'limit', {
      fallback: 30,
      min: 1,
      max: 100,
    });
    const offset = normalizePositiveInt(req.query.offset, 'offset', {
      fallback: 0,
      min: 0,
      max: 100000,
    });
    const startDate = normalizeDate(req.query.startDate, 'startDate');
    const endDate = normalizeDate(req.query.endDate, 'endDate');
    const severity = normalizeSeverity(req.query.severity, 'severity');
    const victimCountry = normalizeOptionalCountryCode(req.query.victimCountry, 'victimCountry');
    const attackerCountry = normalizeOptionalCountryCode(req.query.attackerCountry, 'attackerCountry');
    assertDateRange(startDate, endDate);

    res.json(runtime.computeService.getThreatIntelFeed({
      sort,
      limit,
      offset,
      startDate,
      endDate,
      severity,
      victimCountry,
      attackerCountry,
    }));
  });

  app.get('/api/v1/map/summary', (req, res) => {
    const startDate = normalizeDate(req.query.startDate, 'startDate');
    const endDate = normalizeDate(req.query.endDate, 'endDate');
    assertDateRange(startDate, endDate);

    res.json(runtime.computeService.getThreatMapSummary({
      startDate,
      endDate,
    }));
  });

  app.get('/api/v1/map/trends', (req, res) => {
    const startDate = normalizeDate(req.query.startDate, 'startDate');
    const endDate = normalizeDate(req.query.endDate, 'endDate');
    assertDateRange(startDate, endDate);

    res.json(runtime.computeService.getThreatTrend({
      startDate,
      endDate,
    }));
  });

  app.get('/api/v1/map/ransomware-kpis', (req, res) => {
    const startDate = normalizeDate(req.query.startDate, 'startDate');
    const endDate = normalizeDate(req.query.endDate, 'endDate');
    assertDateRange(startDate, endDate);

    res.json(runtime.computeService.getRansomwareKpis({
      startDate,
      endDate,
    }));
  });

  app.get('/api/v1/map/flows', (req, res) => {
    const startDate = normalizeDate(req.query.startDate, 'startDate');
    const endDate = normalizeDate(req.query.endDate, 'endDate');
    assertDateRange(startDate, endDate);

    res.json(runtime.computeService.getAllFlowsSummary({
      startDate,
      endDate,
    }));
  });

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({
        error: {
          code: 'validation_error',
          message: error.message,
        },
      });
      return;
    }

    console.error(error);
    res.status(500).json({
      error: {
        code: 'internal_error',
        message: extractErrorMessage(error, '服务器内部错误'),
      },
    });
  });

  return app;
}
