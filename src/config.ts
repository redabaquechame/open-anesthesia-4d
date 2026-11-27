/**
 * Project-level settings.
 *
 * REPORT_ISSUE_URL: set this to "https://github.com/<owner>/<repo>/issues/new" once the GitHub
 * repository exists. While it is empty, "Report a mistake" copies a ready-to-send report to the
 * clipboard instead of opening GitHub.
 */
export const REPORT_ISSUE_URL = '';

/** Build identifier shown in reports so a reviewer's comment can be matched to a version. */
export const BUILD_ID: string = `${__APP_VERSION__} (${__BUILD_DATE__})`;
