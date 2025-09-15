import type { CSSSize } from '@/lib/utils/styles';
import { cssVariable } from '@/lib/utils/styles';
import styles from './spinner/Spinner.module.scss';
export default function LoadingSpinner(props: LoadingSpinnerProps) {
  return (
    <div
      className={styles['loader']}
      aria-label="Loading..."
      role="status"
      style={cssVariable('--spinner-size', props.size ? `${props.size}px` : '40px')}
    />
  );
}

interface LoadingSpinnerProps {
  size?: CSSSize;
}
