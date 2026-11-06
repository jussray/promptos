import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const REPOSITORY = 'jussray/promptos';
const FOUNDER = 'jussray';
const WORKFLOW = '.github/workflows/founder-safe-pr-refresh.yml';
const CONTRACT = 'juss.promptos.founder-app-merge.v1';
const SHA = /^[a-f0-9]{40}$/;
const RECEIPT_RE = /<!-- juss-founder-app-merge:v1:([A-Za-z0-9_-]{20,1600}):([a-f0-9]{64}) -->/;
const RECEIPT_WINDOW_MS = 15 * 60 * 1000;

function required(condition, message) {
  if (!condition) throw new Error('APP_MERGE_AUTHORITY_BLOCKED: ' + message);
}

function checkKey(key) {
  required(typeof key === 'string' && Buffer.byteLength(key, 'utf8') >= 32,
    'Merge receipt signing key is unavailable or too short.');
}

function normalized(candidate) {
  const d = {
    contract: candidate.contract,
    repository: candidate.repository,
    prNumber: candidate.prNumber,
    headSha: candidate.headSha,
    baseSha: candidate.baseSha,
    workflowRunId: candidate.workflowRunId,
    founder: candidate.founder,
    issuedAt: candidate.issuedAt,
    nonce: candidate.nonce,
  };
  required(d.contract === CONTRACT && d.repository === REPOSITORY && d.founder === FOUNDER,
    'Receipt contract, repository, or founder mismatch.');
  required(Number.isSafeInteger(d.prNumber) && d.prNumber > 0 && d.prNumber < 1000000000,
    'Invalid PR number.');
  required(SHA.test(d.headSha || '') && SHA.test(d.baseSha || '') && d.headSha !== d.baseSha,
    'Receipt SHA missing or malformed.');
  required(Number.isSafeInteger(d.workflowRunId) && d.workflowRunId > 0,
    'Invalid workflow-run identity.');
  required(typeof d.issuedAt === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(d.issuedAt)
    && Number.isFinite(Date.parse(d.issuedAt)), 'Invalid timestamp.');
  required(typeof d.nonce === 'string' && /^[a-f0-9]{32}$/.test(d.nonce),
    'Invalid receipt nonce.');
  return d;
}

function signedText(encoded, secret) {
  return createHmac('sha256', secret)
    .update('juss-founder-app-merge-v1\n' + encoded, 'utf8').digest('hex');
}

// A signature alone cannot authorize execution. GitHub must independently prove
// the founder-dispatched workflow, exact PR candidate, merge actor and result.
export function createApprovalComment(details, secret) {
  checkKey(secret);
  const d = normalized({
    contract: CONTRACT, repository: REPOSITORY, founder: FOUNDER,
    ...details,
    nonce: details.nonce || randomBytes(16).toString('hex'),
  });
  const encoded = Buffer.from(JSON.stringify(d), 'utf8').toString('base64url');
  return '<!-- juss-founder-app-merge:v1:' + encoded + ':'
    + signedText(encoded, secret) + ' -->';
}

export function verifyApprovalComment(body, secret) {
  checkKey(secret);
  required(typeof body === 'string' && body.length < 2500, 'Missing merge proof comment.');
  const match = RECEIPT_RE.exec(body);
  required(match, 'Missing signed founder merge approval.');
  const expected = signedText(match[1], secret);
  required(timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(match[2], 'hex')),
    'Invalid founder merge receipt signature.');
  const parsed = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'));
  const canonical = normalized(parsed);
  required(JSON.stringify(parsed) === JSON.stringify(canonical),
    'Unexpected receipt fields or noncanonical data.');
  return canonical;
}

export async function verifyAppMainPush(event, { secret, read }) {
  checkKey(secret);
  const { repository, ref, actor, triggeringActor, forced, before, after } = event;
  required(repository === REPOSITORY && ref === 'refs/heads/main',
    'Only canonical main pushes qualify.');
  required(typeof actor === 'string' && actor.endsWith('[bot]') && actor === triggeringActor,
    'App actor or triggering actor mismatch.');
  required(forced === 'false' && SHA.test(before || '') && SHA.test(after || '')
    && before !== after && !/^0{40}$/.test(before) && !/^0{40}$/.test(after),
    'Not a normal ancestry-preserving push.');
  required(typeof read === 'function', 'Trusted GitHub evidence reader missing.');

  const prs = await read('/commits/' + after + '/pulls');
  required(Array.isArray(prs), 'Provider did not return associated PRs.');
  const matches = prs.filter((pr) => pr.merged === true && pr.merge_commit_sha === after
    && pr.base?.ref === 'main' && pr.head?.repo?.full_name === REPOSITORY
    && pr.user?.login === FOUNDER && pr.merged_by?.login === actor);
  required(matches.length === 1, 'No unique founder PR merged by the observed App.');
  const pr = matches[0];
  required(Number.isSafeInteger(pr.number) && SHA.test(pr.head?.sha || ''),
    'Provider returned malformed PR identity.');
  const merged = Date.parse(pr.merged_at || '');
  required(Number.isFinite(merged), 'GitHub merge timestamp missing.');

  const matchingProofs = [];
  for (let page = 1; page <= 5; page++) {
    const comments = await read('/issues/' + pr.number + '/comments?per_page=100&page=' + page);
    required(Array.isArray(comments), 'Provider did not return PR comment evidence.');
    for (const comment of comments) {
      if (comment.user?.login !== actor || comment.user?.type !== 'Bot'
        || !comment.body?.includes('juss-founder-app-merge:v1:')) continue;
      try {
        const candidate = verifyApprovalComment(comment.body, secret);
        if (candidate.prNumber === pr.number && candidate.headSha === pr.head.sha
          && candidate.baseSha === before) {
          const issued = Date.parse(candidate.issuedAt);
          if (merged >= issued && merged <= issued + RECEIPT_WINDOW_MS) {
            matchingProofs.push(candidate);
          }
        }
      } catch { /* Irrelevant or invalid comments cannot authorize a merge. */ }
    }
    if (comments.length < 100) break;
    required(page < 5, 'Too many comments to exhaustively verify.');
  }
  required(matchingProofs.length === 1,
    'Missing or ambiguous App-authored signed receipt inside the merge window.');
  const proof = matchingProofs[0];
  const issued = Date.parse(proof.issuedAt);

  const run = await read('/actions/runs/' + proof.workflowRunId);
  required(run?.event === 'workflow_dispatch' && run.actor?.login === FOUNDER
    && run.head_sha === before && run.head_branch === 'main'
    && typeof run.path === 'string' && run.path.startsWith(WORKFLOW),
    'Founder-run provenance could not be established.');
  const runCreated = Date.parse(run.created_at || '');
  required(Number.isFinite(runCreated) && runCreated <= issued
    && issued <= runCreated + RECEIPT_WINDOW_MS,
    'Receipt was not issued in the authorized workflow window.');
  return {
    founderAuthorized: true,
    authority: 'signed-founder-dispatch-app-merge',
    prNumber: pr.number,
    workflowRunId: proof.workflowRunId,
    headSha: proof.headSha,
    baseSha: proof.baseSha,
    mergeSha: after,
  };
}

export function isFounderDirectPush({ actor, triggeringActor }) {
  return actor === FOUNDER && triggeringActor === FOUNDER;
}
