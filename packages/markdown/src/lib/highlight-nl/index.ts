import Prism from 'prismjs';

import { commands, constants, keywords, reporters } from './netlogo-syntax-constants';

const notWordCh = /[\s[(\])]/.source;
const wordCh = /[^\s[(\])]/.source;
const wordEnd = `(?=${notWordCh}|$)`;
const wordStart = `(${notWordCh}|^)`;

const wordRegEx = (pattern: string): { pattern: RegExp; lookbehind: boolean } => ({
  pattern: new RegExp(`${wordStart}(${pattern})${wordEnd}`, 'i'),
  lookbehind: true,
});
const memberRegEx = (words: Array<string>): ReturnType<typeof wordRegEx> =>
  wordRegEx(`(?:${words.join('|')})`);

const keywordRegex = ((): RegExp => {
  const normalKeyword = memberRegEx(keywords).pattern.source;
  const xsOwn = wordRegEx(`${wordCh}*-own`).pattern.source;
  return new RegExp(`${normalKeyword}|${xsOwn}`, 'i');
})();

const NetLogo = {
  comment: { pattern: /(^|[^\\]);.*/, lookbehind: true },
  string: { pattern: /"(?:[^\\]|\\.)*?"/, greedy: true },
  keyword: keywordRegex,
  command: memberRegEx(commands),
  reporter: memberRegEx(reporters),
  number: wordRegEx(/0x[a-f\d]+|[-+]?(?:\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/.source),
  constant: memberRegEx(constants),
  variable: wordRegEx(`${wordCh}+`),
};

const highlightNL = (code: string): string => Prism.highlight(code, NetLogo, 'netlogo');

export default highlightNL;
