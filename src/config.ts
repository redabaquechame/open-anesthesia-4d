/**
 * Project-level settings.
 *
 * REPORT_ISSUE_URL: set this to "https://github.com/<owner>/<repo>/issues/new" once the GitHub
 * repository exists. While it is empty, "Report a mistake" copies a ready-to-send report to the
 * clipboard instead of opening GitHub.
 */
export const REPORT_ISSUE_URL = 'https://github.com/redabaquechame/open-anesthesia-4d/issues/new';

/**
 * Build identifier shown in reports so a reviewer's comment can be matched to an exact build.
 * The commit hash is unique per build; the date alone was shared by every build of the same day (audit F41).
 */
export const BUILD_COMMIT: string = __BUILD_COMMIT__;
export const BUILD_ID: string = `${__APP_VERSION__}+${__BUILD_COMMIT__} (${__BUILD_DATE__})`;
