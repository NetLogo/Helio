// ---------------------------------------------------------------------------------------------------------------------
// module
// ---------------------------------------------------------------------------------------------------------------------

export interface ModuleOptions {
  /**
   * Image size hints
   *
   * @example 'attrs style url'
   * @default 'style'
   */
  imageSize?: string | string[] | false;

  /**
   * List of content extensions; anything else as an asset
   *
   * @example 'md'
   * @default 'md csv ya?ml json'
   */
  contentExtensions?: string | string[];

  /**
   * Display debug messages
   *
   * @example true
   * @default false
   */
  debug?: boolean;

  /**
   * If imageSizes includes 'attrs', override static width/height attributes on images
   * if one is provided. Setting this to false will still add missing width/height attributes.
   *
   * @example false
   * @default true
   */
  overrideStaticDimensions?: boolean;
}

// ---------------------------------------------------------------------------------------------------------------------
// assets
// ---------------------------------------------------------------------------------------------------------------------

export type ImageSize = Array<"style" | "src" | "url" | "attrs">;

export type AssetConfig = {
  srcAttr: string;
  content: string[];
  width?: number;
  height?: number;
};

export interface AssetMessage {
  event: "update" | "remove" | "refresh";
  src?: string;
  width?: string;
  height?: string;
}

// ---------------------------------------------------------------------------------------------------------------------
// sockets
// ---------------------------------------------------------------------------------------------------------------------

export type Callback = (data: any) => void;

export interface SocketInstance {
  send: (data: any) => SocketInstance;
  addHandler: (handler: Callback) => SocketInstance;
}
