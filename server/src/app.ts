import express, { type NextFunction, type Request, type Response } from 'express';
import { MOCK_INCIDENTS } from './mock-incidents.js';
import { MOCK_LATEST_CONTENT } from './mock-feed.js';
import { buildCountryHoverResponse, buildLatestContentResponse } from './service.js';
import {
  ValidationError,
  assertDateRange,
  normalizePositiveInt,
  normalizeCountryCode,
  normalizeDate,
  normalizeQueryText,
} from './validation.js';

export function createApp() {
  const app = express();

  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/map/country-hover', (req: Request, res: Response) => {
    const victimCountry = normalizeCountryCode(req.query.victimCountry, 'victimCountry');
    const startDate = normalizeDate(req.query.startDate, 'startDate');
    const endDate = normalizeDate(req.query.endDate, 'endDate');
    assertDateRange(startDate, endDate);

    res.json(
      buildCountryHoverResponse(MOCK_INCIDENTS, {
        victimCountry,
        startDate,
        endDate,
      }),
    );
  });

  app.get('/api/content/latest', (req: Request, res: Response) => {
    const category = normalizeQueryText(req.query.category, 'category', 'sql').toLowerCase();
    const limit = normalizePositiveInt(req.query.limit, 'limit', {
      fallback: 5,
      min: 1,
      max: 20,
    });
    const offset = normalizePositiveInt(req.query.offset, 'offset', {
      fallback: 0,
      min: 0,
      max: 1000,
    });

    res.json(
      buildLatestContentResponse(MOCK_LATEST_CONTENT, {
        category,
        limit,
        offset,
      }),
    );
  });

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ValidationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
