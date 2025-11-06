import { minimatch } from 'minimatch';
class Announcement {
  public readonly id!: string;
  public readonly kind!: 'toast' | 'banner';
  public readonly appliesToVersions!: Array<string>;
  public readonly appliesToPaths!: Array<string>;
  public readonly html!: string | undefined;
  public readonly createdAt!: Date;
  public readonly expiresAt: Date | null = null;
  public readonly attributes: Record<string, unknown> = {};

  public constructor(props: {
    id: string;
    kind: 'toast' | 'banner';
    appliesToVersions: Array<string>;
    appliesToPaths: Array<string>;
    html?: string;
    createdAt: Date;
    expiresAt?: Date | null;
    attributes?: Record<string, unknown>;
  }) {
    Object.assign(this, props);
    this.createdAt = new Date(props.createdAt);
    this.expiresAt = props.expiresAt ? new Date(props.expiresAt) : null;
  }

  private _hasNotExpired(at: Date = new Date()): boolean {
    return this.createdAt <= at && (this.expiresAt === null || at < this.expiresAt);
  }

  public appliesTo(route: string, version: string, at: Date = new Date()): boolean {
    // prettier-ignore
    return (
      this._hasNotExpired(at) &&
      this.appliesToVersions.some((versionPattern) => minimatch(version, versionPattern)) &&
      this.appliesToPaths.some((pathPattern) => minimatch(route, pathPattern))
    );
  }
}
type Announcements = Array<Announcement>;

export { Announcement };
export type { Announcements };
