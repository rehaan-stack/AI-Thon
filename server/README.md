# Tabulytix API

The frontend processes files locally by default. This service exposes the same parsing, diagnostics, cleaning, and export engines for a local deployment, an internal tool, or a future authenticated client.

## Run

```bash
npm run server
```

The API listens on `http://127.0.0.1:8787` by default. Use `PORT` to change the port, `CORS_ORIGIN` for a comma-separated origin allowlist, `TABULYTIX_API_KEY` to require `Authorization: Bearer ...` on versioned endpoints, and `TABULYTIX_MAX_BODY_BYTES`, `TABULYTIX_MAX_ROWS`, or `TABULYTIX_MAX_COLUMNS` to tune request limits.

## Endpoints

- `GET /api/health` — liveness check.
- `GET /api/v1/operations` — supported cleaning operations.
- `POST /api/v1/parse` — parse CSV/TSV text (`fileName`, `content`) or Excel base64 (`fileName`, `contentBase64`, optional `selectedSheet`) and return the dataset plus diagnostics.
- `POST /api/v1/analyze` — profile an existing dataset and return quality scoring plus recommendations.
- `POST /api/v1/pipeline` — return the local AI recommendation pipeline for a dataset.
- `POST /api/v1/clean` — execute one operation with `{ dataset, operation }` and return the changed dataset plus refreshed diagnostics.
- `POST /api/v1/export/pdf` — generate a PDF audit report from `{ dataset, originalDataset?, history?, initialQualityScore? }` or a complete `{ report }` object.
- `POST /api/v1/export/csv` — download a cleaned CSV for `{ dataset }`.
- `POST /api/v1/export/xlsx` — download a cleaned XLSX workbook for `{ dataset }`.

The API is intentionally stateless: uploaded data is held in memory for the request and is not written to disk or a database.
