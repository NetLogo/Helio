import type { CSSSize } from '@/lib/utils/styles';
import { cssVariable } from '@/lib/utils/styles';
import type { JSX } from 'react';
import styles from './spinner/Spinner.module.scss';

export default function LoadingSpinner(props: LoadingSpinnerProps): JSX.Element {
  return (
    <div
      className={styles['loader']}
      aria-label="Loading..."
      role="status"
      style={cssVariable('--spinner-size', props.size ?? '40px')}
    />
  );
}

type LoadingSpinnerProps = {
  size?: CSSSize;
};
