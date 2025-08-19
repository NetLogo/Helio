import type { Root } from 'hast';
import type { Plugin } from 'unified';

interface LogOptions {
  source?: string;
}
export const remarkRehypeLog: Plugin<[LogOptions], Root> = ({
  source = '',
} = {}) => {
  return (tree) => {
    console.log(`Root node ((${source})):`, tree);
  };
};
