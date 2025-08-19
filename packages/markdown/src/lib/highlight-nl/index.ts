// @ts-nocheck
import Prism from 'prismjs';

import {
  commands,
  constants,
  keywords,
  reporters,
} from './netlogo-syntax-constants';

const notWordCh = /[\s\[\(\]\)]/.source;
const wordCh = /[^\s\[\(\]\)]/.source;
const wordEnd = `(?=${notWordCh}|$)`;
const wordStart = `(${notWordCh}|^)`;

const wordRegEx = (pattern) => ({
  pattern: new RegExp(`${wordStart}(${pattern})${wordEnd}`, 'i'),
  lookbehind: true,
});
const memberRegEx = (words) => wordRegEx(`(?:${words.join('|')})`);

const keywordRegex = (() => {
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

const highlightNL = (code) => Prism.highlight(code, NetLogo);

export default highlightNL;
