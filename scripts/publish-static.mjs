import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { locales } from '../src/locales.mjs';
import { eventPath, localePath } from '../src/shared.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const branch = 'deploy-static';

export function staticVercelConfig(source) {
  return {
    ...source,
    framework: null,
    installCommand: '',
    buildCommand: '',
    outputDirectory: '.',
    git: {
      ...source.git,
      deploymentEnabled: { '**': false, [branch]: true },
    },
  };
}

export function staticArtifactMessage(sourceSha) {
  if (!/^[0-9a-f]{40}$/i.test(sourceSha)) throw new Error('Source commit must be a full Git SHA.');
  return `Publish static artifact from source ${sourceSha}`;
}

async function requireFile(path) {
  try {
    await readFile(path);
  } catch {
    throw new Error(`Static output is missing ${path.split(/[\\/]/).pop()}.`);
  }
}

export async function verifyStaticOutput(distDir) {
  await requireFile(join(distDir, 'index.html'));
  await requireFile(join(distDir, 'feed.xml'));
  await requireFile(join(distDir, 'sitemap.xml'));
  await requireFile(join(distDir, 'assets', 'app.mjs'));
  await requireFile(join(distDir, 'assets', 'style.css'));

  const [events, health, platforms, heat] = await Promise.all(
    ['events', 'health', 'platforms', 'topic-heat'].map(async name =>
      JSON.parse(await readFile(join(distDir, `${name}.json`), 'utf8')),
    ),
  );
  if (!Array.isArray(events)) throw new Error('Static events data must be an array.');
  if (!health || !['ok', 'degraded'].includes(health.status) || !Number.isFinite(Date.parse(health.lastAttemptAt))) {
    throw new Error('Static health data is incomplete.');
  }
  if (!platforms?.codex || !platforms?.claude) throw new Error('Static platform data must include Codex and Claude.');
  if (!Number.isFinite(Date.parse(heat?.observedAt)) || !Array.isArray(heat?.posts)) {
    throw new Error('Static topic heat data is incomplete.');
  }

  for (const lang of Object.keys(locales)) {
    const home = join(distDir, ...localePath(lang).split('/'), 'index.html');
    await requireFile(home);
    for (const event of events) {
      const detail = join(distDir, ...eventPath(lang, event.id).split('/'), 'index.html');
      await requireFile(detail);
    }
  }
  return { locales: Object.keys(locales).length, events: events.length };
}

function git(args, { env = process.env, cwd = root, allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd, env, encoding: 'utf8', windowsHide: true });
  if (result.error || (result.status !== 0 && !allowFailure)) {
    throw new Error(`Git ${args[0]} failed${result.status == null ? '' : ` (exit ${result.status})`}.`);
  }
  return { status: result.status, stdout: result.stdout ?? '' };
}

async function publish() {
  const distDir = join(root, 'dist');
  const report = await verifyStaticOutput(distDir);
  const sourceSha = git(['rev-parse', 'HEAD']).stdout.trim();
  const message = staticArtifactMessage(sourceSha);
  const sourceConfig = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
  const commonDir = resolve(root, git(['rev-parse', '--git-common-dir']).stdout.trim());
  const dryRun = process.argv.includes('--dry-run');
  const stagingDir = await mkdtemp(join(tmpdir(), 'reset-static-'));
  const indexPath = join(stagingDir, 'index');
  const configPath = join(distDir, 'vercel.json');
  let configCreated = false;

  try {
    try {
      await access(configPath);
      throw new Error('The build output already contains vercel.json; refusing to replace it.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    await writeFile(configPath, `${JSON.stringify(staticVercelConfig(sourceConfig), null, 2)}\n`);
    configCreated = true;

    const indexEnv = {
      ...process.env,
      GIT_DIR: commonDir,
      GIT_WORK_TREE: distDir,
      GIT_INDEX_FILE: indexPath,
    };
    git(['read-tree', '--empty'], { env: indexEnv });
    git(['add', '--all', '--', '.'], { env: indexEnv, cwd: distDir });
    const tree = git(['write-tree'], { env: indexEnv }).stdout.trim();

    let parent = null;
    if (!dryRun) {
      const listing = git(['ls-remote', '--heads', 'origin', `refs/heads/${branch}`]);
      const remoteSha = listing.stdout.trim().split(/\s+/)[0];
      if (remoteSha) {
        git(['fetch', '--no-tags', 'origin', `refs/heads/${branch}:refs/remotes/origin/${branch}`]);
        parent = git(['rev-parse', `refs/remotes/origin/${branch}`]).stdout.trim();
        const parentTree = git(['rev-parse', `${parent}^{tree}`]).stdout.trim();
        if (parentTree === tree) {
          console.log(`Static output unchanged; deploy-static remains at ${parent}.`);
          return;
        }
      }
    }

    const commitEnv = {
      ...process.env,
      GIT_AUTHOR_NAME: 'github-actions[bot]',
      GIT_AUTHOR_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
      GIT_COMMITTER_NAME: 'github-actions[bot]',
      GIT_COMMITTER_EMAIL: '41898282+github-actions[bot]@users.noreply.github.com',
    };
    const commitArgs = ['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', message];
    const commit = git(commitArgs, { env: commitEnv }).stdout.trim();

    if (dryRun) {
      console.log(`Dry run: ${report.locales} locales, ${report.events} event pages; source ${sourceSha}; artifact commit ${commit}.`);
      return;
    }

    try {
      git(['push', 'origin', `${commit}:refs/heads/${branch}`]);
    } catch {
      throw new Error('Could not fast-forward deploy-static; no force push was attempted. Re-fetch and review the artifact branch before retrying.');
    }
    console.log(`Published ${report.locales} locales and ${report.events} events from ${sourceSha} to ${branch} at ${commit}.`);
  } finally {
    if (configCreated) await rm(configPath, { force: true });
    await rm(stagingDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await publish();
}
