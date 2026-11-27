import { BUILD_ID, REPORT_ISSUE_URL } from '../config';
import type { ClinicalClaim } from '../standards/claimRegistry';

export interface ReportContext {
  moduleTab: string;
  locale: string;
  claim?: ClinicalClaim;
}

export function buildReportText(ctx: ReportContext): string {
  const lines = [
    'Clinical error report — Open Anesthesia 4D',
    `Build: ${BUILD_ID}`,
    `Module: ${ctx.moduleTab}`,
    `Locale: ${ctx.locale}`,
  ];
  if (ctx.claim) {
    lines.push(`Claim id: ${ctx.claim.id}`, `Claim: ${ctx.claim.claim}`);
    if (ctx.claim.value) lines.push(`Value in app: ${ctx.claim.value}`);
  }
  lines.push('', 'What is wrong:', '', 'What it should be (with source / guideline):', '', 'Your role (optional):');
  return lines.join('\n');
}

/**
 * Opens a pre-filled GitHub issue when REPORT_ISSUE_URL is configured; otherwise copies the
 * report to the clipboard. Returns which of the two happened.
 */
export async function reportMistake(ctx: ReportContext): Promise<'opened' | 'copied' | 'failed'> {
  const text = buildReportText(ctx);
  if (REPORT_ISSUE_URL) {
    const params = new URLSearchParams({
      template: 'clinical-error.yml',
      title: `[${ctx.moduleTab}] ${ctx.claim ? ctx.claim.id : 'Clinical error'}`,
      module: ctx.moduleTab,
      claim_id: ctx.claim?.id ?? '',
      build: BUILD_ID,
      locale: ctx.locale,
    });
    window.open(`${REPORT_ISSUE_URL}?${params.toString()}`, '_blank', 'noopener');
    return 'opened';
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
