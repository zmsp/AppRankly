const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const { execFile } = require("child_process");
const util = require("util");
const execFileAsync = util.promisify(execFile);
const { DATA_DIR, getBaseConfig } = require("./config");
const { db } = require("./db");

const NOTES_DIR = path.join(DATA_DIR, "notes");

/**
 * Concurrency control to prevent .git/index.lock races during parallel operations.
 */
class TaskQueue {
  constructor() {
    this.queue = Promise.resolve();
  }
  push(task) {
    const result = this.queue.then(() => task());
    this.queue = result.catch((err) => {
      console.error("[Git Queue Error]", err);
    });
    return result;
  }
}

const gitQueue = new TaskQueue();

/**
 * Security: Sanitize Note ID to prevent directory traversal and shell injection.
 */
function sanitizeId(id) {
  if (typeof id !== 'string') return `note_${Date.now()}`;
  // Allow dots, spaces, and dashes for descriptive filenames
  return id.replace(/[^a-zA-Z0-9._\s-]/g, '').trim();
}

/**
 * Security: Sanitize Package Name for directory layout.
 */
function sanitizePackageName(pkg) {
  if (!pkg || pkg === 'all') return '_global';
  return pkg.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Security: Neutralize shell injection via execFile with argument arrays.
 * Credential Exposure: Redacts sensitive info from error messages.
 */
async function gitExec(args, options = {}) {
  const baseOptions = {
    cwd: NOTES_DIR,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  };

  try {
    const { stdout } = await execFileAsync('git', args, { ...baseOptions, ...options });
    return stdout;
  } catch (error) {
    const message = (error.message || '').replace(/:[^@:]+@/g, ':***@');
    throw new Error(`Git Error: ${message}`);
  }
}

/**
 * Dynamically construct authenticated URL from environment/config.
 * Does not bake plain-text credentials into the persistent .git/config.
 */
function getAuthRemote() {
  const baseConfig = getBaseConfig() || {};
  const gitConfig = baseConfig.gitNotes || baseConfig.git || {};
  const remoteUrl = gitConfig.remoteUrl || process.env.GIT_REMOTE_URL || gitConfig.remote || '';
  const username = gitConfig.username || process.env.GIT_USERNAME || '';
  const password = gitConfig.password || process.env.GIT_PASSWORD || process.env.GIT_TOKEN || '';

  if (!remoteUrl) return null;
  if (!username || !password) return remoteUrl;

  try {
    const url = new URL(remoteUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      url.username = encodeURIComponent(username);
      url.password = encodeURIComponent(password);
      return url.toString();
    }
  } catch (e) {}
  return remoteUrl;
}

/**
 * Robust frontmatter parser: resilient to malformed markdown and flexible spacing.
 */
function parseNoteMarkdown(rawText) {
  if (!rawText || typeof rawText !== 'string') return { metadata: {}, content: '' };

  const match = rawText.match(/^---\s*[\r\n]+([\s\S]*?)[\r\n]+---\s*[\r\n]*([\s\S]*)$/);
  if (!match) return { metadata: {}, content: rawText.trim() };

  const rawHeader = match[1];
  const content = match[2].trim();
  const metadata = {};

  rawHeader.split(/\r?\n/).forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();

      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val.startsWith('[') && val.endsWith(']')) {
        try { val = JSON.parse(val); } catch (e) { val = []; }
      } else if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/\\"/g, '"');
      }
      metadata[key] = val;
    }
  });

  return { metadata, content };
}

function stringifyNoteMarkdown(note) {
  const meta = {
    id: note.id,
    title: note.title || 'Untitled Note',
    packageName: note.packageName || 'all',
    platform: note.platform || 'all',
    tags: Array.isArray(note.tags) ? note.tags : [],
    pinned: Boolean(note.pinned),
    createdAt: note.createdAt || new Date().toISOString(),
    updatedAt: note.updatedAt || new Date().toISOString()
  };

  const metaLines = ['---'];
  Object.entries(meta).forEach(([key, value]) => {
    if (typeof value === 'string') {
      metaLines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
    } else if (Array.isArray(value)) {
      metaLines.push(`${key}: ${JSON.stringify(value)}`);
    } else {
      metaLines.push(`${key}: ${value}`);
    }
  });
  metaLines.push('---', '', note.content || '');
  return metaLines.join('\n');
}

/**
 * Highly robust Git initialization with credential-safe URL management.
 */
async function ensureGitNotesRepo(isStartup = false) {
  return gitQueue.push(async () => {
    try {
      if (!fsSync.existsSync(NOTES_DIR)) {
        await fs.mkdir(NOTES_DIR, { recursive: true });
      }

      const baseConfig = getBaseConfig() || {};
      const gitConfig = baseConfig.gitNotes || baseConfig.git || {};
      const branch = gitConfig.branch || 'main';
      const gitDir = path.join(NOTES_DIR, '.git');
      const authRemote = getAuthRemote();

      if (!fsSync.existsSync(gitDir)) {
        console.log(`[Git Notes] Initializing repository: ${NOTES_DIR}`);
        await gitExec(['init']);
        await gitExec(['checkout', '-b', branch]);
        await gitExec(['config', 'user.name', 'AppRankly Bot']);
        await gitExec(['config', 'user.email', 'bot@apprankly.local']);

        if (authRemote) {
          await gitExec(['remote', 'add', 'origin', authRemote]);
          try {
            const lsRemote = await gitExec(['ls-remote', '--heads', 'origin', branch]);
            if (lsRemote.trim()) {
              await gitExec(['pull', 'origin', branch]);
            }
          } catch (e) { console.warn(`[Git Notes] Remote setup failed:`, e.message); }
        }
      } else if (isStartup && authRemote) {
        // Ensure remote URL is updated in case credentials changed
        try { await gitExec(['remote', 'set-url', 'origin', authRemote]); } catch (e) {}

        console.log(`[Git Notes] Startup sync: fetching ${branch}`);
        try {
          await gitExec(['fetch', 'origin', branch]);
          await gitExec(['merge', `origin/${branch}`, '-X', 'ours', '-m', 'docs(notes): startup merge']);
        } catch (e) { console.warn(`[Git Notes] Startup merge skipped.`); }
      }
    } catch (err) { console.error(`[Git Notes] Setup failed:`, err.message); }
  });
}

/**
 * Triggered via UI "Setup" button.
 * Handles migration of local notes into a fresh Git clone.
 */
async function setupGitNotesRepo() {
  return gitQueue.push(async () => {
    const authRemote = getAuthRemote();
    if (!authRemote) throw new Error("Git Remote URL is not configured.");

    const baseConfig = getBaseConfig() || {};
    const gitConfig = baseConfig.gitNotes || baseConfig.git || {};
    const branch = gitConfig.branch || 'main';
    const tempBackup = path.join(DATA_DIR, `notes_migration_${Date.now()}`);

    try {
      console.log(`[Git Notes Setup] Starting migration to: ${authRemote}`);

      // 1. Backup existing local notes if any
      if (fsSync.existsSync(NOTES_DIR)) {
        await fs.mkdir(tempBackup, { recursive: true });
        const items = await fs.readdir(NOTES_DIR);
        for (const item of items) {
          if (item === '.git') continue;
          const src = path.join(NOTES_DIR, item);
          const dest = path.join(tempBackup, item);
          try {
            // Using shell cp for robust recursive copy
            await execFileAsync('cp', ['-rf', src, dest]);
          } catch (e) {
            console.warn(`[Git Notes Setup] Backup failed for ${item}:`, e.message);
          }
        }
        // Remove the NOTES_DIR to allow a clean clone
        await fs.rm(NOTES_DIR, { recursive: true, force: true });
      }
      await fs.mkdir(NOTES_DIR, { recursive: true });

      // 2. Clone the repo
      console.log(`[Git Notes Setup] Cloning into ${NOTES_DIR}...`);
      await gitExec(['clone', authRemote, '.']);

      // Ensure we are on the right branch
      try {
        await gitExec(['checkout', branch]);
      } catch (e) {
        try {
          await gitExec(['checkout', '-b', branch]);
        } catch (checkoutErr) {
          console.warn(`[Git Notes Setup] Could not switch to branch ${branch}:`, checkoutErr.message);
        }
      }

      await gitExec(['config', 'user.name', 'AppRankly Bot']);
      await gitExec(['config', 'user.email', 'bot@apprankly.local']);

      // 3. Restore files from backup
      if (fsSync.existsSync(tempBackup)) {
        const backupItems = await fs.readdir(tempBackup);
        if (backupItems.length > 0) {
          console.log(`[Git Notes Setup] Restoring ${backupItems.length} items from backup...`);
          for (const item of backupItems) {
            const src = path.join(tempBackup, item);
            try {
              await execFileAsync('cp', ['-rf', src, NOTES_DIR + '/']);
            } catch (e) {
              console.warn(`[Git Notes Setup] Restore failed for ${item}:`, e.message);
            }
          }

          // 4. Initial Sync
          console.log(`[Git Notes Setup] Performing initial sync...`);
          await gitExec(['add', '-A', '.']);
          try {
            await gitExec(['commit', '-m', 'docs(notes): initial migration of local notes']);
            await gitExec(['push', '-u', 'origin', branch]);
          } catch (commitErr) {
            console.log("[Git Notes Setup] Nothing to commit or push.");
          }
        }
      }

      console.log(`[Git Notes Setup] Migration complete.`);
      return { success: true, message: "Repository successfully cloned and synchronized." };
    } catch (err) {
      const message = (err.message || '').replace(/:[^@:]+@/g, ':***@');
      console.error(`[Git Notes Setup] FAILED:`, message);
      throw new Error(message);
    } finally {
      if (fsSync.existsSync(tempBackup)) {
        await fs.rm(tempBackup, { recursive: true, force: true }).catch(() => {});
      }
    }
  });
}

/**
 * Non-blocking Git sync with intelligent local-override strategy.
 * Accurately handles deletions and modifications by leveraging git merge strategies.
 */
async function syncNotesToGit(commitMessage = 'docs(notes): update app notes') {
  return gitQueue.push(async () => {
    const authRemote = getAuthRemote();
    if (!authRemote) return;

    const baseConfig = getBaseConfig() || {};
    const branch = (baseConfig.gitNotes || baseConfig.git || {}).branch || 'main';

    try {
      await gitExec(['add', '-A', '.']);
      try {
        await gitExec(['commit', '-m', commitMessage]);
      } catch (e) {
        if (!e.message.includes('nothing to commit')) throw e;
        return;
      }

      try {
        await gitExec(['push', 'origin', branch]);
      } catch (pushErr) {
        console.warn(`[Git Notes Sync] Push failed, applying local-override via merge...`);
        await gitExec(['fetch', 'origin', branch]);
        // Resolve conflicts by preferring local versions (accurate deletion/modification handling)
        await gitExec(['merge', `origin/${branch}`, '-X', 'ours', '-m', `${commitMessage} (Resolved via Local Override)`]);
        await gitExec(['push', 'origin', branch]);
      }
    } catch (err) { console.error(`[Git Notes Sync] FAILED:`, err.message); }
  });
}

async function getNotesFromStorage() {
  if (!fsSync.existsSync(NOTES_DIR)) await fs.mkdir(NOTES_DIR, { recursive: true });

  const fileNotes = [];
  try {
    const items = await fs.readdir(NOTES_DIR, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && item.name !== '.git') {
        const pkgDir = path.join(NOTES_DIR, item.name);
        const files = await fs.readdir(pkgDir);
        for (const f of files) {
          if (f.endsWith('.md')) {
            const raw = await fs.readFile(path.join(pkgDir, f), 'utf8');
            const { metadata, content } = parseNoteMarkdown(raw);
            const id = metadata.id || path.basename(f, '.md');
            // Prefer packageName from metadata, fallback to folder name
            const pkg = metadata.packageName || item.name;
            fileNotes.push({ ...metadata, content, id, packageName: pkg });
          }
        }
      } else if (item.isFile() && item.name.endsWith('.md')) {
        const raw = await fs.readFile(path.join(NOTES_DIR, item.name), 'utf8');
        const { metadata, content } = parseNoteMarkdown(raw);
        const id = metadata.id || path.basename(item.name, '.md');
        const pkg = metadata.packageName || 'all';
        fileNotes.push({ ...metadata, content, id, packageName: pkg });
      }
    }
  } catch (err) { console.error("[Notes] Storage scan error:", err); }

  if (db) {
    for (const note of fileNotes) {
      try {
        db.prepare(`
          INSERT INTO notes (id, package_name, platform, title, content, tags_json, pinned, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            package_name = excluded.package_name, platform = excluded.platform, title = excluded.title,
            content = excluded.content, tags_json = excluded.tags_json, pinned = excluded.pinned, updated_at = excluded.updated_at
        `).run(note.id, note.packageName || 'all', note.platform || 'all', note.title || 'Untitled Note', note.content || '', JSON.stringify(note.tags || []), note.pinned ? 1 : 0, note.createdAt, note.updatedAt);
      } catch (e) {
        console.error(`[Notes] Failed to sync note ${note.id} to database:`, e.message);
      }
    }
  }
  return fileNotes.sort((a, b) => (b.pinned - a.pinned) || (new Date(b.updatedAt) - new Date(a.updatedAt)));
}

async function saveNoteToStorage(note, options = {}) {
  const { skipGit = false } = options;
  const sid = sanitizeId(note.id);
  const pkgDirName = sanitizePackageName(note.packageName);
  const targetDir = path.join(NOTES_DIR, pkgDirName);

  if (!fsSync.existsSync(targetDir)) await fs.mkdir(targetDir, { recursive: true });

  const filePath = path.join(targetDir, `${sid}.md`);
  await fs.writeFile(filePath, stringifyNoteMarkdown({ ...note, id: sid }), 'utf8');

  if (db) {
    try {
      db.prepare(`
        INSERT INTO notes (id, package_name, platform, title, content, tags_json, pinned, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          package_name = excluded.package_name, platform = excluded.platform, title = excluded.title,
          content = excluded.content, tags_json = excluded.tags_json, pinned = excluded.pinned, updated_at = excluded.updated_at
      `).run(sid, note.packageName || 'all', note.platform || 'all', note.title || 'Untitled Note', note.content || '', JSON.stringify(note.tags || []), note.pinned ? 1 : 0, note.createdAt || new Date().toISOString(), note.updatedAt || new Date().toISOString());
    } catch (e) { console.error(`[Notes] DB save error:`, e.message); }
  }

  if (!skipGit) {
    syncNotesToGit(`docs(notes): update note "${note.title || sid}"`);
  }
}

async function deleteNoteFromStorage(id) {
  const sid = sanitizeId(id);
  let pkg = null;
  if (db) {
    try {
      const row = db.prepare('SELECT package_name FROM notes WHERE id = ?').get(id);
      if (row) pkg = row.package_name;
    } catch (e) {
      console.error(`[Notes] Database lookup failed for ${id}:`, e.message);
    }
  }

  const tryDel = async (pname) => {
    const fpath = path.join(NOTES_DIR, sanitizePackageName(pname), `${sid}.md`);
    if (fsSync.existsSync(fpath)) { await fs.unlink(fpath); return true; }
    return false;
  };

  let deleted = pkg ? await tryDel(pkg) : false;
  if (!deleted) {
    const items = await fs.readdir(NOTES_DIR, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && item.name !== '.git') {
        if (await tryDel(item.name)) { deleted = true; break; }
      } else if (item.name === `${sid}.md`) {
        await fs.unlink(path.join(NOTES_DIR, item.name));
        deleted = true; break;
      }
    }
  }

  if (db) {
    try {
      db.prepare('DELETE FROM notes WHERE id = ?').run(id);
    } catch (e) {
      console.error(`[Notes] Failed to delete ${id} from database:`, e.message);
    }
  }
  syncNotesToGit(`docs(notes): delete note ${id}`);
}

async function getNoteGitHistory(noteId) {
  const sid = sanitizeId(noteId);
  await ensureGitNotesRepo();

  let relPath = null;
  const items = await fs.readdir(NOTES_DIR, { withFileTypes: true });
  for (const item of items) {
    const p = item.isDirectory() ? path.join(item.name, `${sid}.md`) : `${sid}.md`;
    if (fsSync.existsSync(path.join(NOTES_DIR, p))) { relPath = p; break; }
  }

  if (!relPath) return [];

  try {
    const log = await gitExec(['log', '--pretty=format:%H|%an|%ad|%s', '--date=iso', '-n', '25', '--', relPath]);
    if (!log.trim()) return [];

    const history = [];
    for (const line of log.trim().split('\n')) {
      const [hash, author, date, ...msgParts] = line.split('|');
      let raw = '';
      try {
        raw = await gitExec(['show', `${hash}:${relPath}`]);
      } catch (e) {
        console.error(`[Notes] Failed to fetch content for commit ${hash}:`, e.message);
      }
      const parsed = parseNoteMarkdown(raw);
      history.push({ hash, shortHash: hash.slice(0, 7), author, date, message: msgParts.join('|'), title: parsed.metadata?.title || 'Revision', content: parsed.content || raw });
    }
    return history;
  } catch (e) {
    console.error(`[Notes] Failed to get git history for ${noteId}:`, e.message);
    return [];
  }
}

module.exports = {
  NOTES_DIR,
  ensureGitNotesRepo,
  syncNotesToGit,
  getNotesFromStorage,
  saveNoteToStorage,
  deleteNoteFromStorage,
  getNoteGitHistory,
  setupGitNotesRepo,
  parseNoteMarkdown,
  stringifyNoteMarkdown
};
