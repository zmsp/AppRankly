import React from 'react';

/**
 * A lightweight, rich Markdown renderer supporting GFM syntax:
 * Headings, Bold, Italic, Code, Codeblocks, Bullet lists, Checklists (- [x]), Quotes, Tables, Links, and Horizontal Rules.
 */
export default function MarkdownViewer({ content = '', className = '' }) {
  if (!content) {
    return <div className="text-slate-400 italic text-xs py-4">No content provided. Click Edit to add notes.</div>;
  }

  const renderFormattedInline = (text) => {
    if (!text || typeof text !== 'string') return null;
    
    // Split text by tokens while preserving markdown delimiters
    const elements = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Inline Code: `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        elements.push(
          <code key={key++} className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono text-xs border border-white/10">
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Bold: **text** or __text__
      const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
      if (boldMatch) {
        elements.push(
          <strong key={key++} className="font-bold text-white">
            {boldMatch[2]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic: *text* or _text_
      const italicMatch = remaining.match(/^(\*|_)(.*?)\1/);
      if (italicMatch) {
        elements.push(
          <em key={key++} className="italic text-slate-200">
            {italicMatch[2]}
          </em>
        );
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Link: [title](url)
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        elements.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors"
          >
            {linkMatch[1]}
          </a>
        );
        remaining = remaining.slice(linkMatch[0].length);
        continue;
      }

      // Next plain text character chunk up to next special char
      const nextSpecial = remaining.search(/[`*_\[]/);
      if (nextSpecial === -1) {
        elements.push(<span key={key++}>{remaining}</span>);
        break;
      } else if (nextSpecial === 0) {
        elements.push(<span key={key++}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
      } else {
        elements.push(<span key={key++}>{remaining.slice(0, nextSpecial)}</span>);
        remaining = remaining.slice(nextSpecial);
      }
    }

    return elements;
  };

  // Process line-by-line block structures
  const lines = typeof content === 'string' ? content.split('\n') : [];
  const blocks = [];
  let inCodeBlock = false;
  let codeBlockContent = [];
  let codeBlockLang = '';
  let tableRows = [];
  let keyIdx = 0;

  const flushTable = () => {
    if (tableRows.length === 0) return;
    const headerRow = tableRows[0];
    const bodyRows = tableRows.slice(1).filter(r => !r.every(c => /^[-:]+$/.test(c.trim())));

    blocks.push(
      <div key={`tbl_${keyIdx++}`} className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60 p-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5 text-slate-300 font-semibold">
              {headerRow.map((cell, cIdx) => (
                <th key={cIdx} className="px-3 py-2">
                  {renderFormattedInline(cell.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((r, rIdx) => (
              <tr key={rIdx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                {r.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-slate-300">
                    {renderFormattedInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push(
          <div key={`code_${keyIdx++}`} className="my-3 rounded-xl bg-slate-950 p-4 border border-white/10 font-mono text-xs overflow-x-auto text-emerald-400 shadow-inner">
            {codeBlockLang && <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2 select-none">{codeBlockLang}</div>}
            <pre className="whitespace-pre">{codeBlockContent.join('\n')}</pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLang = '';
      } else {
        flushTable();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Table rows starting/ending with |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cols = line.trim().slice(1, -1).split('|');
      tableRows.push(cols);
      continue;
    } else {
      flushTable();
    }

    // Headings
    if (line.startsWith('# ')) {
      blocks.push(
        <h1 key={`h1_${keyIdx++}`} className="text-xl md:text-2xl font-black text-white mt-6 mb-3 border-b border-white/10 pb-2">
          {renderFormattedInline(line.slice(2))}
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={`h2_${keyIdx++}`} className="text-lg md:text-xl font-bold text-sky-300 mt-5 mb-2">
          {renderFormattedInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={`h3_${keyIdx++}`} className="text-base font-semibold text-indigo-300 mt-4 mb-1">
          {renderFormattedInline(line.slice(4))}
        </h3>
      );
      continue;
    }
    if (line.startsWith('#### ')) {
      blocks.push(
        <h4 key={`h4_${keyIdx++}`} className="text-sm font-semibold text-slate-200 mt-3 mb-1">
          {renderFormattedInline(line.slice(5))}
        </h4>
      );
      continue;
    }

    // Horizontal Rule
    if (/^(---|[*]{3,}|_{3,})$/.test(line.trim())) {
      blocks.push(<hr key={`hr_${keyIdx++}`} className="my-5 border-t border-white/10" />);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push(
        <blockquote key={`quote_${keyIdx++}`} className="my-2 border-l-4 border-indigo-500 pl-4 py-1.5 text-slate-300 bg-indigo-500/10 rounded-r-lg italic text-xs">
          {renderFormattedInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Task Checklist: - [ ] or - [x]
    const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)/);
    if (taskMatch) {
      const checked = taskMatch[2].toLowerCase() === 'x';
      blocks.push(
        <div key={`task_${keyIdx++}`} className="flex items-start space-x-2 my-1.5 text-xs">
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mt-0.5 h-3.5 w-3.5 rounded border-slate-700 text-accent-blue focus:ring-0 accent-accent-blue cursor-default"
          />
          <span className={checked ? "line-through text-slate-500" : "text-slate-200"}>
            {renderFormattedInline(taskMatch[3])}
          </span>
        </div>
      );
      continue;
    }

    // Bullet List: - or *
    const bulletMatch = line.match(/^(\s*)([-*])\s+(.*)/);
    if (bulletMatch) {
      blocks.push(
        <div key={`bullet_${keyIdx++}`} className="flex items-start space-x-2 my-1 pl-2 text-xs text-slate-300">
          <span className="text-accent-blue font-bold">•</span>
          <span>{renderFormattedInline(bulletMatch[3])}</span>
        </div>
      );
      continue;
    }

    // Numbered List: 1. 2.
    const numMatch = line.match(/^(\s*)(\d+)\.\s+(.*)/);
    if (numMatch) {
      blocks.push(
        <div key={`num_${keyIdx++}`} className="flex items-start space-x-2 my-1 pl-2 text-xs text-slate-300">
          <span className="text-amber-400 font-semibold text-[11px]">{numMatch[2]}.</span>
          <span>{renderFormattedInline(numMatch[3])}</span>
        </div>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      blocks.push(<div key={`blank_${keyIdx++}`} className="h-2" />);
      continue;
    }

    // Normal Paragraph
    blocks.push(
      <p key={`p_${keyIdx++}`} className="my-1.5 text-xs md:text-sm text-slate-300 leading-relaxed">
        {renderFormattedInline(line)}
      </p>
    );
  }

  flushTable();

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
}
