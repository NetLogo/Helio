import { MEGABYTE } from '#src/shared/utils/consts.ts';
import type { FastifyRateLimitOptions } from '@fastify/rate-limit';
import type { BetterAuthRateLimitOptions } from 'better-auth';

const MINUTE_MS = 60 * 1000;
const rules = {
  limits: {
    fileUpload: {
      size: { max: 15 * MEGABYTE } as MinMax,
      filesPerUpload: { max: 10 } as MinMax,
      allowedContentTypes: [
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'application/octet-stream',
        'application/pdf',
        'text/plain',

        // All documents
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
        'application/vnd.apple.pages',
        'application/vnd.apple.numbers',
        'application/vnd.apple.keynote',
        'application/vnd.google-apps.document',
        'application/vnd.google-apps.spreadsheet',
        'application/vnd.google-apps.presentation',
        'application/vnd.google-apps.drawing',

        // All audio
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        'audio/flac',
        'audio/aac',
        'audio/webm',
        'audio/opus',

        // All video
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/x-matroska',
        'video/x-msvideo',
        'video/x-flv',

        // All code
        'application/javascript',
        'application/x-python-code',
        'application/x-java',
        'application/x-c++',
        'application/x-csharp',
        'application/x-ruby',
        'application/x-php',
        'application/x-go',
        'application/x-swift',
        'application/x-kotlin',

        // All archives
        'application/zip',
        'application/x-tar',
        'application/x-gzip',
        'application/x-7z-compressed',
        'application/x-rar-compressed',

        // All fonts
        'font/woff',
        'font/woff2',
        'application/font-woff',
        'application/font-woff2',
        'application/vnd.ms-fontobject',
        'application/x-font-ttf',
        'application/x-font-opentype',

        // All datasets
        'application/x-sql',
        'application/x-csv',
        'application/x-xml',
        'application/json',
        'application/x-yaml',
        'application/x-parquet',
        'application/x-avro',

        // All 3D models
        'model/gltf+json',
        'model/gltf-binary',
        'model/obj',
        'model/stl',
        'model/ply',
        'model/3mf',
        'model/x3d+xml',
        'model/x3d+binary',

        // All CAD files
        'application/vnd.autodesk.autocad.dwg',
        'application/vnd.autodesk.autocad.dxf',
        'application/vnd.autodesk.autocad.dgn',
        'application/vnd.autodesk.autocad.dwt',
        'application/vnd.autodesk.autocad.dws',

        // All GIS files
        'application/vnd.esri.shapefile',
        'application/vnd.esri.filegdb',
        'application/vnd.esri.arcgis-rest',
        'application/vnd.google-earth.kml+xml',
        'application/vnd.google-earth.kmz',

        // All eBooks
        'application/epub+zip',
        'application/x-mobipocket-ebook',
        'application/x-azw',
        'application/x-azw3',
        'application/x-azw4',

        // All vector graphics
        'image/svg+xml',
        'application/vnd.adobe.illustrator',
        'application/x-illustrator',
        'application/vnd.corel-draw',
        'application/x-coreldraw',

        // All disk images
        'application/x-iso9660-image',
        'application/x-apple-diskimage',
        'application/x-virtualbox-vdi',
        'application/x-virtualbox-vhd',
        'application/x-virtualbox-vmdk',

        // All email files
        'application/vnd.ms-outlook',
        'application/x-mbox',
        'application/x-eml',
        'application/x-msg',
      ] as Array<string>,
    },
    fileUploadRoute: {
      strict: {
        timeWindow: MINUTE_MS, // 1 minute
        max: 5,
      },
      loose: {
        timeWindow: MINUTE_MS,
        max: 50,
      },
    } as Record<'strict' | 'loose', FastifyRateLimitOptions>,

    auth: {
      window: 10,
      max: 100,
      customRules: {
        '/get-session': false,
        '/forget-password': { window: 60, max: 5 },
        '/sign-in': { window: 60, max: 15 },
        '/sign-up': { window: 60, max: 10 },
      },
    } as BetterAuthRateLimitOptions,

    comment: {
      content: { min: 1, max: 10_000 } as MinMax,
      // Hard ceiling on nodes materialized per tree request. maximumShownRepliesPerLevel ^
      // maximumNested is unbounded fan-out on paper; this is the backstop, not a target.
      // At the default limit=20 the dense worst case is 20 + 40 + 80 + 160 = 300, well clear.
      // At the schema-legal maximum limit=100 it is 1,500, so a fully-dense 100-root page
      // truncates its deepest level and reports counts there instead - the intended
      // degradation. Retune knowingly if this bites real threads.
      tree: { maxNodes: 1_000 },
    },

    notification: {
      eventBatchSize: 50,
      maxEventAttempts: 5,
      previewLength: 280,
    },
  },
  mime: {
    deniedTypes: [
      'application/x-msdownload',
      'application/x-sh',
      'application/x-csh',
      'application/x-executable',
      'application/x-msdos-program',
      'application/x-msi',
      'application/x-apple-diskimage',
      'application/x-bat',
      'application/x-compressed-executable',
      'application/x-debian-package',
      'application/x-dosexec',
      'application/x-rpm',
    ],
    mappedTypes: [
      { pattern: /^text\/plain$/, mapped: 'application/octet-stream' },
      { pattern: /^text\/html$/, mapped: 'application/octet-stream' },
      { pattern: /^application\/javascript$/, mapped: 'application/octet-stream' },
      { pattern: /^application\/x-/, mapped: 'application/octet-stream' },
      { pattern: /^image\/svg\+xml$/, mapped: 'application/octet-stream' },
      { pattern: /^application\/xml/, mapped: 'application/octet-stream' },
    ],
    undetectedTypesDefault: 'application/octet-stream',
    // Declared types that aren't real claims (browser fallbacks for unrecognized
    // extensions like .nlogox); skip the declared-vs-detected mismatch check.
    mismatchAllowedDeclaredTypes: ['application/octet-stream'],
  },
  avatar: {
    maxFileSize: 2 * MEGABYTE,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
  },
  auth: {
    name: {
      length: { min: 2, max: 50 } as MinMax,
    },
    password: {
      length: { min: 8, max: 128 } as MinMax,
      complexity: [
        { pattern: /[A-Z]/, description: 'at least one uppercase letter' },
        { pattern: /[a-z]/, description: 'at least one lowercase letter' },
        { pattern: /[0-9]/, description: 'at least one digit' },
        {
          pattern: /[!@#$%^&*(),.?":{}|<>]/,
          description: 'at least one special character',
        },
      ] as Array<RegexRule>,
    },
  },
};

type MinMax = { min?: number; max?: number };
type RegexRule = { pattern: RegExp; description: string };

export default rules;
