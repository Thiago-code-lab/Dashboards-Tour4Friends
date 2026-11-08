import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDocument } from 'yaml';
import { z } from 'zod';

const stepSchema = z.object({
  uses: z.string().optional(),
  run: z.string().optional(),
  if: z.string().optional(),
  with: z.record(z.string(), z.unknown()).optional(),
});
const workflowSchema = z.object({
  on: z.object({
    push: z.object({ branches: z.array(z.string()) }),
    pull_request: z.unknown(),
    workflow_dispatch: z.null(),
  }),
  permissions: z.object({ contents: z.literal('read') }).strict(),
  jobs: z.object({
    build: z.object({
      env: z.object({ VITE_DATA_MODE: z.literal('demo'), VITE_API_BASE_URL: z.literal('') }),
      steps: z.array(stepSchema),
    }),
    backend: z.unknown(),
    deploy: z.object({
      if: z.string(),
      needs: z.array(z.string()),
      permissions: z.object({ pages: z.literal('write'), 'id-token': z.literal('write') }).strict(),
      steps: z.array(stepSchema),
    }),
  }),
});
const document = parseDocument(readFileSync('.github/workflows/pages.yml', 'utf8'), {
  uniqueKeys: true,
});
if (document.errors.length)
  throw new Error(document.errors.map((error) => error.message).join('\n'));
const workflow = workflowSchema.parse(document.toJS());
const pagesUpload = workflow.jobs.build.steps.filter((step) =>
  step.uses?.startsWith('actions/upload-pages-artifact@'),
);
const gates = [workflow.jobs.deploy.if, ...pagesUpload.map((step) => step.if ?? '')];

// Only the two explicit GitHub equality predicates are accepted; no eval or permissive fallback.
function acceptsEvent(condition: string, event_name: string, ref: string): boolean {
  const context: Record<string, string> = { event_name, ref };
  return condition.split(' && ').every((clause) => {
    const match = /^github\.(event_name|ref) == '([^']+)'$/.exec(clause);
    if (!match) throw new Error(`Cláusula fora do contrato: ${clause}`);
    return context[match[1]] === match[2];
  });
}

describe('contrato de publicação do workflow real', () => {
  it('protege o único artefato Pages e o job de deploy pela mesma condição restrita', () => {
    expect(pagesUpload).toHaveLength(1);
    for (const gate of gates)
      expect(gate).toBe("github.event_name == 'push' && github.ref == 'refs/heads/main'");
  });
  it.each([
    ['pull_request', 'refs/pull/3/merge', false],
    ['workflow_dispatch', 'refs/heads/feature/final-quality-and-delivery-v1', false],
    ['workflow_dispatch', 'refs/heads/main', false],
    ['push', 'refs/heads/feature/final-quality-and-delivery-v1', false],
    ['push', 'refs/heads/main', true],
  ])('%s em %s permite publicação: %s', (event, ref, expected) => {
    for (const gate of gates) expect(acceptsEvent(gate, event, ref)).toBe(expected);
  });
  it('aguarda frontend e backend e limita os privilégios de publicação ao deploy', () => {
    expect(workflow.jobs.deploy.needs.toSorted()).toEqual(['backend', 'build']);
    expect(workflow.permissions).toEqual({ contents: 'read' });
    expect(workflow.jobs.deploy.permissions).toEqual({ pages: 'write', 'id-token': 'write' });
    expect(
      workflow.jobs.deploy.steps.some((step) => step.uses?.startsWith('actions/deploy-pages@')),
    ).toBe(true);
    expect(
      workflow.jobs.build.steps.some((step) => step.uses?.startsWith('actions/deploy-pages@')),
    ).toBe(false);
  });
  it('mantém push automático somente na main, build demo e artefato de revisão sem Pages', () => {
    expect(workflow.on.push.branches).toEqual(['main']);
    expect(workflow.jobs.build.env).toEqual({ VITE_DATA_MODE: 'demo', VITE_API_BASE_URL: '' });
    expect(workflow.jobs.build.steps.some((step) => step.run === 'npm run build:demo')).toBe(true);
    const review = workflow.jobs.build.steps.find(
      (step) => step.with?.name === 'release-candidate-static',
    );
    expect(review?.uses).toMatch(/^actions\/upload-artifact@/);
    expect(review?.if).toBe('success()');
  });
});
