// ---------------------------------------------------------------------------------------------------------------------
// module
// ---------------------------------------------------------------------------------------------------------------------

export type ModuleOptions = {
  /**
   * Image size hints
   *
   * @example 'attrs style url'
   * @default 'style'
   */
  imageSize?: string | Array<string> | false;

  /**
   * List of content extensions; anything else as an asset
   *
   * @example 'md'
   * @default 'md csv ya?ml json'
   */
  contentExtensions?: string | Array<string>;

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
};

// ---------------------------------------------------------------------------------------------------------------------
// assets
// ---------------------------------------------------------------------------------------------------------------------

export type ImageSize = Array<"style" | "src" | "url" | "attrs">;

export type AssetConfig = {
  srcAttr: string;
  content: Array<string>;
  width?: number;
  height?: number;
};

export type AssetMessage = {
  event: "update" | "remove" | "refresh";
  src?: string;
  width?: string;
  height?: string;
};

// ---------------------------------------------------------------------------------------------------------------------
// sockets
// ---------------------------------------------------------------------------------------------------------------------

export type Callback = (data: unknown) => void;

export type SocketInstance = {
  send: (data: unknown) => SocketInstance;
  addHandler: (handler: Callback) => SocketInstance;
};
