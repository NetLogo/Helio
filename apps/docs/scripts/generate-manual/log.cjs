const _cerr = [console.error, '❌'];
const _cinfo = [console.info, '💡'];
const _clog = [console.log, '💬'];
const _cwarn = [console.warn, '⚠️ '];

const _cprefix = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `[${hours}:${minutes}] (generate-manual) `;
};

const _makelogger = (fn, emoji) => {
  return (...args) => {
    fn(_cprefix(), emoji, ...args);
  };
};

console.error = _makelogger(..._cerr);
console.info = _makelogger(..._cinfo);
console.log = _makelogger(..._clog);
console.warn = _makelogger(..._cwarn);
