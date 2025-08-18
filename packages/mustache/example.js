import MustacheRenderer from './dist/Renderer.js';

const config = {
  projectRoot: '.',
  scanRoot: './test-data',
  outputRoot: './test-dist',
  defaults: {
    language: 'en',
    extension: 'md',
    output: true,
    title: 'Test Page',
    inheritFrom: [0],
  },
};

const renderer = new MustacheRenderer(config);
renderer.build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});

renderer.buildSingle('test.yaml').then((results) => {
  console.log(JSON.stringify(results, null, 2));
});

renderer
  .buildFromConfiguration(
    [
      {
        output: true,
        title: 'Direct Config Page',
        content: 'This page was built from direct configuration.',
      },
      {
        output: true,
        language: 'fr',
        title: 'Page de configuration directe',
        content:
          "Cette page a été construite à partir d'une configuration directe.",
      },
      {
        output: true,
        language: 'es',
        title: 'Página de configuración directa',
        content:
          'Esta página se construyó a partir de una configuración directa.',
      },
    ],
    'direct-config',
    `
# {{title}}
## {{content}}
`
  )
  .then((results) => {
    console.log(JSON.stringify(results, null, 2));
  })
  .catch((error) => {
    console.error('Build from configuration failed:', error);
    process.exit(1);
  });

// Rendering a counter
for (let i = 1; i <= 5; i++) {
  renderer
    .buildFromConfiguration(
      [
        {
          count: i,
        },
        {
          output: true,
          title: `Counter Page ${i}`,
        },
        {
          output: true,
          language: 'fr',
          title: `Page de compteur ${i}`,
        },
        {
          output: true,
          language: 'es',
          title: `Página de contador ${i}`,
        },
      ],
      `counter/counter-${i}`,
      `# {{title}}
This is counter page number **{{count}}**.
`
    )
    .then((result) => {
      console.log(`Rendered counter page ${i}:`, result);
    });
}

// Invalid file
renderer
  .buildFromConfiguration(
    [
      {
        output: true,
        title: 'Direct Config Page 1',
        content: 'This page was built from direct configuration.',
        inheritFrom: [-1],
      },
      {
        output: true,
        title: 'Direct Config Page 23',
        content: 'This page was built from direct configuration.',
        language: 'es',
      },
    ],
    'direct-config-2',
    `# {{title}}
## {{content}}
`
  )
  .then((results) => {
    console.log(JSON.stringify(results, null, 2));
  });
