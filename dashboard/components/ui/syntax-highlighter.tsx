'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface SyntaxHighlighterProps {
  code: string;
  language?: 'typescript' | 'javascript' | 'sql' | 'bash' | 'json' | 'env';
  showLineNumbers?: boolean;
  className?: string;
}

// Token types and their colors
const tokenColors = {
  keyword: 'text-purple-400',
  string: 'text-emerald-400',
  number: 'text-amber-400',
  comment: 'text-zinc-500 italic',
  function: 'text-blue-400',
  variable: 'text-sky-300',
  operator: 'text-pink-400',
  property: 'text-cyan-300',
  type: 'text-yellow-300',
  builtin: 'text-orange-400',
  constant: 'text-red-400',
  punctuation: 'text-zinc-400',
  tag: 'text-red-400',
};

type PatternType = { pattern: RegExp; type: string };

// Patterns for different languages
const typescriptPatterns: PatternType[] = [
  // Comments
  { pattern: /(\/\/.*$)/gm, type: 'comment' },
  { pattern: /(\/\*[\s\S]*?\*\/)/g, type: 'comment' },
  // Strings
  { pattern: /(`[^`]*`)/g, type: 'string' },
  { pattern: /('[^']*')/g, type: 'string' },
  { pattern: /("[^"]*")/g, type: 'string' },
  // Keywords
  { pattern: /\b(async|await|const|let|var|function|return|if|else|for|while|class|interface|type|import|export|from|default|try|catch|throw|new|typeof|instanceof|in|of|as|extends|implements)\b/g, type: 'keyword' },
  // Types
  { pattern: /\b(string|number|boolean|void|null|undefined|any|unknown|never|Promise|Array|Record|Partial|Required|Readonly|Pick|Omit)\b/g, type: 'type' },
  // Builtins
  { pattern: /\b(console|process|window|document|fetch|Response|Request|Headers|JSON|Math|Date|Error|Object|Array|Map|Set)\b/g, type: 'builtin' },
  // Functions - word followed by (
  { pattern: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, type: 'function' },
  // Numbers
  { pattern: /\b(\d+\.?\d*)\b/g, type: 'number' },
  // Operators
  { pattern: /(=>|===|!==|==|!=|<=|>=|&&|\|\||[+\-*/%=<>!&|^~])/g, type: 'operator' },
];

const patterns: Record<string, PatternType[]> = {
  typescript: typescriptPatterns,
  javascript: typescriptPatterns, // Uses typescript patterns
  sql: [
    // Comments
    { pattern: /(--.*$)/gm, type: 'comment' },
    { pattern: /(\/\*[\s\S]*?\*\/)/g, type: 'comment' },
    // Strings
    { pattern: /('[^']*')/g, type: 'string' },
    // Keywords
    { pattern: /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|LIKE|ILIKE|IS|NULL|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|ORDER|BY|ASC|DESC|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|INDEX|DROP|ALTER|ADD|COLUMN|PRIMARY|KEY|FOREIGN|REFERENCES|UNIQUE|DEFAULT|CHECK|CONSTRAINT|CASCADE|IF|EXISTS|BEGIN|END|COMMIT|ROLLBACK|TRUNCATE|GRANT|REVOKE)\b/gi, type: 'keyword' },
    // Functions
    { pattern: /\b(COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|CAST|CONVERT|CONCAT|SUBSTRING|TRIM|UPPER|LOWER|NOW|CURRENT_TIMESTAMP|CURRENT_DATE)\b/gi, type: 'function' },
    // Numbers
    { pattern: /\b(\d+\.?\d*)\b/g, type: 'number' },
    // Operators
    { pattern: /(=|<>|<=|>=|<|>|\+|-|\*|\/|%)/g, type: 'operator' },
  ],
  bash: [
    // Comments
    { pattern: /(#.*$)/gm, type: 'comment' },
    // Strings
    { pattern: /('[^']*')/g, type: 'string' },
    { pattern: /("[^"]*")/g, type: 'string' },
    // Variables
    { pattern: /(\$[a-zA-Z_][a-zA-Z0-9_]*|\$\{[^}]+\})/g, type: 'variable' },
    // Keywords
    { pattern: /\b(cd|ls|mkdir|rm|cp|mv|cat|echo|export|source|if|then|else|fi|for|do|done|while|case|esac|function|return)\b/g, type: 'keyword' },
  ],
  json: [
    // Strings (keys and values)
    { pattern: /("(?:[^"\\]|\\.)*")\s*:/g, type: 'property' },
    { pattern: /:\s*("(?:[^"\\]|\\.)*")/g, type: 'string' },
    // Numbers
    { pattern: /:\s*(-?\d+\.?\d*)/g, type: 'number' },
    // Booleans and null
    { pattern: /\b(true|false|null)\b/g, type: 'constant' },
  ],
  env: [
    // Comments
    { pattern: /(#.*$)/gm, type: 'comment' },
    // Keys
    { pattern: /^([A-Z_][A-Z0-9_]*)/gm, type: 'variable' },
    // Values after =
    { pattern: /=(.*)$/gm, type: 'string' },
  ],
};

function detectLanguage(code: string): SyntaxHighlighterProps['language'] {
  if (code.includes('SELECT') || code.includes('INSERT') || code.includes('CREATE TABLE')) {
    return 'sql';
  }
  if (code.includes('async') || code.includes('await') || code.includes('const') || code.includes('fetch')) {
    return 'typescript';
  }
  if (code.startsWith('{') || code.includes('":')) {
    return 'json';
  }
  if (code.includes('ATLASHUB_') || code.includes('=http')) {
    return 'env';
  }
  if (code.includes('cd ') || code.includes('export ') || code.includes('pnpm ')) {
    return 'bash';
  }
  return 'typescript';
}

function highlightCode(code: string, language: SyntaxHighlighterProps['language']): string {
  const lang = language || detectLanguage(code) || 'typescript';
  const langPatterns = patterns[lang] || patterns.typescript;
  
  // Escape HTML first
  let result = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Track replacements to avoid double-highlighting
  const replacements: { start: number; end: number; html: string }[] = [];
  
  for (const { pattern, type } of langPatterns) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;
    while ((match = regex.exec(result)) !== null) {
      const captured = match[1] || match[0];
      const start = match.index + (match[0].indexOf(captured));
      const end = start + captured.length;
      
      // Check if this overlaps with existing replacements
      const overlaps = replacements.some(
        r => (start >= r.start && start < r.end) || (end > r.start && end <= r.end)
      );
      
      if (!overlaps && !captured.includes('</span>')) {
        replacements.push({
          start,
          end,
          html: `<span class="${tokenColors[type as keyof typeof tokenColors]}">${captured}</span>`,
        });
      }
    }
  }
  
  // Sort by position (reverse order for replacement)
  replacements.sort((a, b) => b.start - a.start);
  
  // Apply replacements
  for (const { start, end, html } of replacements) {
    result = result.slice(0, start) + html + result.slice(end);
  }
  
  return result;
}

export function SyntaxHighlighter({
  code,
  language,
  showLineNumbers = false,
  className,
}: SyntaxHighlighterProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedCode = highlightCode(code, language);
  const lines = highlightedCode.split('\n');

  return (
    <div className={cn('relative group', className)}>
      <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-x-auto text-sm font-mono">
        {showLineNumbers ? (
          <code className="block">
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span className="text-zinc-600 select-none w-8 shrink-0 text-right pr-4">
                  {i + 1}
                </span>
                <span dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
              </div>
            ))}
          </code>
        ) : (
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        )}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-800/50 hover:bg-zinc-700"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
