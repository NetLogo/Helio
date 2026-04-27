export interface Mail {
  from: string;
  to: Array<string>;
  subject: string;
  text: string;
  html?: string;
}
