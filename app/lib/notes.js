const path = require("path");
const fs = require("fs");
const { exec, execSync } = require("child_process");
const { DATA_DIR, getBaseConfig } = require("./config");
const { db } = require("./db");

const NOTES_DIR = path.join(DATA_DIR, "notes");

function ensureGitNotesRepo(isStartup = false) {
  if (!fs.existsSync(NOTES_DIR)) {
    try { fs.mkdirSync(NOTES_DIR, { recursive: true }); } catch (e) {}
  }

  const baseConfig = getBaseConfig() || {};
  const gitConfig = baseConfig.gitNotes || baseConfig.git || {};
  const remoteUrl = gitConfig.remoteUrl || process.env.GIT_REMOTE_URL || gitConfig.remote || '';
  const branch = gitConfig.branch || gitConfig.notesBranch || process.env.GIT_NOTES_BRANCH || 'main';
  const username = gitConfig.username || process.env.GIT_USERNAME || '';
  const password = gitConfig.password || process.env.GIT_PASSWORD || process.env.GIT_TOKEN || '';

  const gitDir = path.join(NOTES_DIR, '.git');

  let authRemote = remoteUrl;
  if (username && password && (authRemote.startsWith('https://') || authRemote.startsWith('http://'))) {
    const protocol = authRemote.startsWith('https://') ? 'https://' : 'http://';
    const cleanUrl = authRemote.replace(protocol, '');
    authRemote = `${protocol}${encodeURIComponent(username)}:${encodeURIComponent(password)}@${cleanUrl}`;
  }

  const checkRemoteBranch = () => {
    try {
      const output = execSync(`git ls-remote --heads "${authRemote}" ${branch}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return output.trim() !== '';
    } catch (e) {
      return false;
    }
  };

  if (!fs.existsSync(gitDir)) {
    try {
      if (remoteUrl) {
        console.log(`[Git Notes] Remote URL configured but .git not found. Attempting to setup repository...`);

        const tempBackup = path.join(DATA_DIR, `notes_backup_${Date.now()}`);
        fs.mkdirSync(tempBackup, { recursive: true });

        const existingItems = fs.readdirSync(NOTES_DIR);
        if (existingItems.length > 0) {
          console.log(`[Git Notes] Backing up ${existingItems.length} items to ${tempBackup}`);
          for (const item of existingItems) {
            try {
              execSync(`mv "${path.join(NOTES_DIR, item)}" "${path.join(tempBackup, item)}"`);
            } catch (mvErr) {
              console.warn(`[Git Notes] Failed to move ${item}:`, mvErr.message);
            }
          }
        }

        try {
          const remoteExists = checkRemoteBranch();
          if (remoteExists) {
            console.log(`[Git Notes] Remote branch "${branch}" exists. Cloning...`);
            execSync(`git clone "${authRemote}" .`, { cwd: NOTES_DIR });
            execSync(`git checkout ${branch}`, { cwd: NOTES_DIR });
          } else {
            console.log(`[Git Notes] Remote branch "${branch}" does not exist or repo is empty. Initializing locally...`);
            execSync('git init', { cwd: NOTES_DIR });
            execSync(`git checkout -b ${branch}`, { cwd: NOTES_DIR });
            execSync(`git remote add origin "${authRemote}"`, { cwd: NOTES_DIR });
          }

          execSync(`git config user.name "AppRankly Notes Bot"`, { cwd: NOTES_DIR });
          execSync(`git config user.email "bot@apprankly.local"`, { cwd: NOTES_DIR });

          if (fs.readdirSync(tempBackup).length > 0) {
            console.log(`[Git Notes] Restoring existing notes into repository...`);
            execSync(`cp -rf "${tempBackup}/"* "${NOTES_DIR}/"`, { shell: true });

            execSync(`git add -A .`, { cwd: NOTES_DIR });
            execSync(`git commit -m "docs(notes): sync existing local notes after setup" || true`, { cwd: NOTES_DIR });
            execSync(`git push -u origin ${branch}`, { cwd: NOTES_DIR });
          }
        } catch (setupErr) {
          console.error(`[Git Notes] Setup failed: ${setupErr.message}. Falling back to local init...`);
          if (!fs.existsSync(path.join(NOTES_DIR, '.git'))) {
            execSync('git init', { cwd: NOTES_DIR });
            execSync(`git checkout -b ${branch}`, { cwd: NOTES_DIR });
          }
          execSync(`cp -rf "${tempBackup}/"* "${NOTES_DIR}/"`, { shell: true });
        } finally {
          try { fs.rmSync(tempBackup, { recursive: true, force: true }); } catch (e) {}
        }
      } else {
        console.log(`[Git Notes] No remote configured. Initializing local git repository at ${NOTES_DIR}...`);
        execSync('git init', { cwd: NOTES_DIR });
        execSync(`git checkout -b ${branch}`, { cwd: NOTES_DIR });
        execSync('git config user.name "AppRankly Notes Bot"', { cwd: NOTES_DIR });
        execSync('git config user.email "bot@apprankly.local"', { cwd: NOTES_DIR });
      }
    } catch (e) {
      console.warn(`[Git Notes] Failed to auto-initialize Git repository:`, e.message);
    }
  } else if (isStartup && remoteUrl) {
    const remoteExists = checkRemoteBranch();
    if (!remoteExists) {
      console.log(`[Git Notes] Startup: Remote branch "${branch}" does not exist yet. Skipping pull.`);
      return;
    }

    console.log(`[Git Notes] Performing startup pull for branch "${branch}"...`);
    try {
      execSync(`git add -A .`, { cwd: NOTES_DIR });
      execSync(`git commit -m "docs(notes): local backup before startup pull" || true`, { cwd: NOTES_DIR });

      execSync(`git fetch "${authRemote}" ${branch}`, { cwd: NOTES_DIR });

      try {
        execSync(`git merge FETCH_HEAD -m "docs(notes): startup merge"`, { cwd: NOTES_DIR });
      } catch (mergeErr) {
        console.warn(`[Git Notes] Startup merge conflict. Applying "reset and restore" strategy...`);
        const tempBackup = path.join(DATA_DIR, `notes_restart_backup_${Date.now()}`);
        fs.mkdirSync(tempBackup, { recursive: true });
        execSync(`cp -r "${NOTES_DIR}/"* "${tempBackup}/"`, { shell: true });
        if (fs.existsSync(path.join(tempBackup, '.git'))) fs.rmSync(path.join(tempBackup, '.git'), { recursive: true, force: true });

        execSync(`git reset --hard FETCH_HEAD`, { cwd: NOTES_DIR });

        execSync(`cp -rf "${tempBackup}/"* "${NOTES_DIR}/"`, { shell: true });
        fs.rmSync(tempBackup, { recursive: true, force: true });

        execSync(`git add -A .`, { cwd: NOTES_DIR });
        execSync(`git commit -m "docs(notes): resolved conflicts via local override on startup" || true`, { cwd: NOTES_DIR });
      }
    } catch (e) {
      console.warn(`[Git Notes] Startup sync failed:`, e.message);
    }
  }
}

function syncNotesToGit(commitMessage = 'docs(notes): update app notes') {
  ensureGitNotesRepo();
  const baseConfig = getBaseConfig() || {};
  const gitConfig = baseConfig.gitNotes || baseConfig.git || {};

  const branch = gitConfig.branch || gitConfig.notesBranch || process.env.GIT_NOTES_BRANCH || 'main';
  const username = gitConfig.username || process.env.GIT_USERNAME || '';
  const password = gitConfig.password || process.env.GIT_PASSWORD || process.env.GIT_TOKEN || '';
  const remoteUrl = gitConfig.remoteUrl || process.env.GIT_REMOTE_URL || gitConfig.remote || '';

  let authRemote = remoteUrl;
  if (username && password && (authRemote.startsWith('https://') || authRemote.startsWith('http://'))) {
    const protocol = authRemote.startsWith('https://') ? 'https://' : 'http://';
    const cleanUrl = authRemote.replace(protocol, '');
    authRemote = `${protocol}${encodeURIComponent(username)}:${encodeURIComponent(password)}@${cleanUrl}`;
  }

  const runSync = () => {
    try {
      execSync('git add -A .', { cwd: NOTES_DIR });
      execSync(`git commit -m "${commitMessage.replace(/["\\$`]/g, '\\$&')}" || true`, { cwd: NOTES_DIR });

      if (remoteUrl) {
        try {
          execSync(`git push "${authRemote}" HEAD:${branch}`, { cwd: NOTES_DIR, timeout: 20000 });
          console.log(`[Git Notes Sync] Successfully pushed to remote (${branch})`);
        } catch (pushErr) {
          const branchExistsOnRemote = execSync(`git ls-remote --heads "${authRemote}" ${branch}`, { encoding: 'utf8' }).trim() !== '';

          if (branchExistsOnRemote) {
            console.warn(`[Git Notes Sync] Push failed, likely conflict. Resetting to remote and reapplying local state...`);
            const tempBackup = path.join(DATA_DIR, `notes_sync_backup_${Date.now()}`);
            fs.mkdirSync(tempBackup, { recursive: true });

            execSync(`cp -r "${NOTES_DIR}/"* "${tempBackup}/"`, { shell: true });
            if (fs.existsSync(path.join(tempBackup, '.git'))) fs.rmSync(path.join(tempBackup, '.git'), { recursive: true, force: true });

            execSync(`git fetch "${authRemote}" ${branch}`, { cwd: NOTES_DIR });
            execSync(`git reset --hard FETCH_HEAD`, { cwd: NOTES_DIR });

            execSync(`cp -rf "${tempBackup}/"* "${NOTES_DIR}/"`, { shell: true });
            fs.rmSync(tempBackup, { recursive: true, force: true });

            execSync('git add -A .', { cwd: NOTES_DIR });
            execSync(`git commit -m "${commitMessage} (Conflict Resolved)" || true`, { cwd: NOTES_DIR });
            execSync(`git push "${authRemote}" HEAD:${branch} --force`, { cwd: NOTES_DIR });
            console.log(`[Git Notes Sync] Successfully pushed after resolving conflicts with local override.`);
          } else {
            console.error(`[Git Notes Sync] Push failed: ${pushErr.message}`);
          }
        }
      }
    } catch (err) {
      console.warn(`[Git Notes Sync] Process failed:`, err.message);
    }
  };

  setTimeout(runSync, 0);
}

function parseNoteMarkdown(rawText) {
  if (!rawText) return { metadata: {}, content: '' };
  const frontmatterMatch = rawText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!frontmatterMatch) return { metadata: {}, content: rawText };
  const rawHeader = frontmatterMatch[1];
  const content = frontmatterMatch[2];
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
        val = val.slice(1, -1);
      }
      metadata[key] = val;
    }
  });
  return { metadata, content };
}

function stringifyNoteMarkdown(note) {
  const metaLines = [
    '---',
    `id: "${note.id}"`,
    `title: "${(note.title || '').replace(/"/g, '\\"')}"`,
    `packageName: "${note.packageName || 'all'}"`,
    `platform: "${note.platform || 'all'}"`,
    `tags: ${JSON.stringify(note.tags || [])}`,
    `pinned: ${Boolean(note.pinned)}`,
    `createdAt: "${note.createdAt || new Date().toISOString()}"`,
    `updatedAt: "${note.updatedAt || new Date().toISOString()}"`,
    '---',
    '',
    note.content || ''
  ];
  return metaLines.join('\n');
}

function getNotesFromStorage() {
  if (!fs.existsSync(NOTES_DIR)) {
    try { fs.mkdirSync(NOTES_DIR, { recursive: true }); } catch (e) {}
  }
  const fileNotes = [];
  try {
    if (fs.existsSync(NOTES_DIR)) {
      const subdirs = fs.readdirSync(NOTES_DIR, { withFileTypes: true });
      for (const dirent of subdirs) {
        const processFile = (dir, name, pkg) => {
          if (!name.endsWith('.md')) return;
          try {
            const fullPath = path.join(dir, name);
            const raw = fs.readFileSync(fullPath, 'utf8');
            const { metadata, content } = parseNoteMarkdown(raw);
            fileNotes.push({
              id: metadata.id || path.basename(name, '.md'),
              title: metadata.title || 'Untitled Note',
              packageName: metadata.packageName || pkg,
              platform: metadata.platform || 'all',
              tags: Array.isArray(metadata.tags) ? metadata.tags : [],
              pinned: Boolean(metadata.pinned),
              createdAt: metadata.createdAt || new Date().toISOString(),
              updatedAt: metadata.updatedAt || new Date().toISOString(),
              content
            });
          } catch (e) { console.error(`Error reading note ${name}:`, e); }
        };

        if (dirent.isDirectory() && dirent.name !== '.git') {
          const pkgDir = path.join(NOTES_DIR, dirent.name);
          fs.readdirSync(pkgDir).forEach(f => processFile(pkgDir, f, dirent.name));
        } else if (dirent.name.endsWith('.md')) {
          processFile(NOTES_DIR, dirent.name, 'all');
        }
      }
    }
  } catch (err) { console.error("Error scanning NOTES_DIR:", err); }

  if (db) {
    fileNotes.forEach(note => {
      try {
        db.prepare(`
          INSERT INTO notes (id, package_name, platform, title, content, tags_json, pinned, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            package_name = excluded.package_name, platform = excluded.platform, title = excluded.title,
            content = excluded.content, tags_json = excluded.tags_json, pinned = excluded.pinned, updated_at = excluded.updated_at
        `).run(note.id, note.packageName || 'all', note.platform || 'all', note.title || 'Untitled Note', note.content || '', JSON.stringify(note.tags || []), note.pinned ? 1 : 0, note.createdAt, note.updatedAt);
      } catch (e) {}
    });
  }
  return fileNotes.sort((a, b) => (b.pinned - a.pinned) || (new Date(b.updatedAt) - new Date(a.updatedAt)));
}

function saveNoteToStorage(note) {
  const pkgDirName = (note.packageName && note.packageName !== 'all') ? note.packageName.replace(/[^a-zA-Z0-9._-]/g, '_') : '_global';
  const targetDir = path.join(NOTES_DIR, pkgDirName);
  if (!fs.existsSync(targetDir)) try { fs.mkdirSync(targetDir, { recursive: true }); } catch (e) {}
  const filePath = path.join(targetDir, `${note.id}.md`);
  try { fs.writeFileSync(filePath, stringifyNoteMarkdown(note), 'utf8'); } catch (e) { console.error(`Failed to write note ${filePath}:`, e); }

  if (db) {
    try {
      db.prepare(`
        INSERT INTO notes (id, package_name, platform, title, content, tags_json, pinned, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          package_name = excluded.package_name, platform = excluded.platform, title = excluded.title,
          content = excluded.content, tags_json = excluded.tags_json, pinned = excluded.pinned, updated_at = excluded.updated_at
      `).run(note.id, note.packageName || 'all', note.platform || 'all', note.title || 'Untitled Note', note.content || '', JSON.stringify(note.tags || []), note.pinned ? 1 : 0, note.createdAt, note.updatedAt);
    } catch (e) {}
  }
  syncNotesToGit(`docs(notes): update note "${note.title || note.id}" for ${note.packageName || 'all'}`);
}

function deleteNoteFromStorage(id) {
  if (fs.existsSync(NOTES_DIR)) {
    const subdirs = fs.readdirSync(NOTES_DIR, { withFileTypes: true });
    for (const dirent of subdirs) {
      if (dirent.isDirectory()) {
        const targetPath = path.join(NOTES_DIR, dirent.name, `${id}.md`);
        if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      } else if (dirent.name === `${id}.md`) {
        fs.unlinkSync(path.join(NOTES_DIR, dirent.name));
      }
    }
  }
  if (db) try { db.prepare('DELETE FROM notes WHERE id = ?').run(id); } catch (e) {}
  syncNotesToGit(`docs(notes): delete note ${id}`);
}

function getNoteGitHistory(noteId) {
  ensureGitNotesRepo();
  let relPath = null;
  if (fs.existsSync(NOTES_DIR)) {
    const subdirs = fs.readdirSync(NOTES_DIR, { withFileTypes: true });
    for (const dirent of subdirs) {
      if (dirent.isDirectory()) {
        if (fs.existsSync(path.join(NOTES_DIR, dirent.name, `${noteId}.md`))) { relPath = `${dirent.name}/${noteId}.md`; break; }
      } else if (dirent.name === `${noteId}.md`) { relPath = `${noteId}.md`; break; }
    }
  }
  if (!relPath) return [];
  try {
    const logOutput = execSync(`git log --pretty=format:"%H|%an|%ad|%s" --date=iso -n 25 -- "${relPath}"`, { cwd: NOTES_DIR, encoding: 'utf8' });
    if (!logOutput.trim()) return [];
    return logOutput.trim().split('\n').map(line => {
      const [hash, author, date, ...msgParts] = line.split('|');
      let rawContent = '';
      try { rawContent = execSync(`git show ${hash}:"${relPath}"`, { cwd: NOTES_DIR, encoding: 'utf8' }); } catch (e) {}
      const parsed = parseNoteMarkdown(rawContent);
      return { hash, shortHash: hash.slice(0, 7), author, date, message: msgParts.join('|'), title: parsed.metadata?.title || 'Note Revision', content: parsed.content || rawContent };
    });
  } catch (e) { return []; }
}

module.exports = {
  NOTES_DIR,
  ensureGitNotesRepo,
  syncNotesToGit,
  getNotesFromStorage,
  saveNoteToStorage,
  deleteNoteFromStorage,
  getNoteGitHistory,
  parseNoteMarkdown,
  stringifyNoteMarkdown
};
