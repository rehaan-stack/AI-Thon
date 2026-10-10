import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo, Server } from 'node:net';
import { createApiServer } from '../../server/index';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createApiServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function request(path: string, body?: unknown): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('Tabulytix API', () => {
  it('reports service health and available operations', async () => {
    const health = await request('/api/health');
    const operations = await request('/api/v1/operations');

    expect(health.status).toBe(200);
    expect((await health.json()).ok).toBe(true);
    expect(operations.status).toBe(200);
    expect((await operations.json()).operations.length).toBeGreaterThan(20);
  });

  it('parses, analyzes, cleans, and exports a dataset', async () => {
    const parsedResponse = await request('/api/v1/parse', {
      fileName: 'api-fixture.csv',
      content: 'Name,Email\n Alice ,ALICE@EXAMPLE.COM \nBob,bob@example.com',
    });
    const parsed = await parsedResponse.json();

    expect(parsedResponse.status).toBe(200);
    expect(parsed.dataset.rows).toHaveLength(2);
    expect(parsed.dataset.columns).toHaveLength(2);
    expect(parsed.qualityScore).toBeDefined();
    expect(parsed.aiAnalysis.source).toBe('local');

    const cleanedResponse = await request('/api/v1/clean', {
      dataset: parsed.dataset,
      operation: { actionId: 'trim_whitespace' },
    });
    const cleaned = await cleanedResponse.json();

    expect(cleanedResponse.status).toBe(200);
    expect(cleaned.operation.success).toBe(true);
    expect(cleaned.operation.cellsChanged).toBe(2);

    const exportResponse = await request('/api/v1/export/csv', {
      dataset: cleaned.operation.resultDataset,
    });
    const exportedCsv = await exportResponse.text();
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers.get('content-type')).toContain('text/csv');
    expect(exportedCsv).toContain('Name,Email');
    expect(exportedCsv).toContain('Alice,ALICE@EXAMPLE.COM');

    const pdfResponse = await request('/api/v1/export/pdf', {
      dataset: cleaned.operation.resultDataset,
      originalDataset: parsed.dataset,
      initialQualityScore: parsed.qualityScore.overall,
    });
    const pdf = new Uint8Array(await pdfResponse.arrayBuffer());
    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers.get('content-type')).toContain('application/pdf');
    expect(Buffer.from(pdf).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('rejects unsupported cleaning operations', async () => {
    const response = await request('/api/v1/clean', {
      dataset: {
        meta: { fileName: 'invalid.csv' },
        columns: [{ id: 'col_0', name: 'Name', originalName: 'Name', originalIndex: 0, inferredType: 'string' }],
        rows: [{ __rowId: 'row_0', col_0: 'Alice' }],
      },
      operation: { actionId: 'not_a_real_operation' },
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('Unknown operation');
  });
});
