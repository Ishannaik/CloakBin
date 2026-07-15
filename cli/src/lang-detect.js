/** Map file extension (lowercase, no dot) or bare name → language id */

const EXT_MAP = {
  py: 'python',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  jsx: 'jsx',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  md: 'markdown',
  markdown: 'markdown',
  json: 'json',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  sql: 'sql',
  txt: 'plaintext',
  lua: 'lua',
  pl: 'perl',
  r: 'r',
  dart: 'dart',
  scala: 'scala',
  hs: 'haskell',
  ex: 'elixir',
  exs: 'elixir',
  erl: 'erlang',
  clj: 'clojure',
  vue: 'vue',
  svelte: 'svelte',
  ini: 'ini',
  ps1: 'powershell',
  bat: 'batch',
  cmd: 'batch',
  diff: 'diff',
  patch: 'diff',
  tex: 'latex',
  zig: 'zig',
  nim: 'nim',
  proto: 'protobuf',
  graphql: 'graphql',
  gql: 'graphql',
  tf: 'hcl',
  env: 'bash',
  dockerfile: 'dockerfile',
};

const BARE_NAMES = {
  dockerfile: 'dockerfile',
  makefile: 'makefile',
};

/**
 * Detect language from a filename by extension (or bare Dockerfile/Makefile).
 * @param {string} filename
 * @returns {string|null} lowercase language id, or null
 */
export function detectLanguage(filename) {
  if (!filename || typeof filename !== 'string') return null;

  // basename only
  const base = filename.replace(/\\/g, '/').split('/').pop();
  if (!base) return null;

  const lower = base.toLowerCase();

  // bare names without extension
  if (BARE_NAMES[lower]) return BARE_NAMES[lower];

  const dot = lower.lastIndexOf('.');
  if (dot === -1 || dot === lower.length - 1) return null;

  // handle leading-dot files like .env → ext "env"
  const ext = lower.slice(dot + 1);
  if (!ext) return null;

  return EXT_MAP[ext] ?? null;
}

/** Exported for tests — every value must match LANG_RE */
export const LANGUAGE_MAP = { ...EXT_MAP, ...BARE_NAMES };
