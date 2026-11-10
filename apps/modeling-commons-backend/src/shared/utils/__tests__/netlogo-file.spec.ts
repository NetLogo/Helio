import { describe, expect, test } from 'vitest';
import {
  detectNetlogoVersion,
  getNlogoFileExtension,
  parseNetlogoContents,
  parseNlogo,
  parseNlogox,
} from '#src/shared/utils/netlogo-file.ts';

const SEP = '@#$#@#$#@';

function nlogo(sections: string[]): string {
  return sections.join(SEP);
}

describe('getNlogoFileExtension', () => {
  test('detects the sectioned legacy format', () => {
    expect(getNlogoFileExtension(`code${SEP}ui`)).toBe('nlogo');
  });

  test('detects 3D xml before plain xml', () => {
    expect(getNlogoFileExtension('<?xml version="1.0"?><model version="NetLogo 3D 6.4">')).toBe(
      'nlogox3d',
    );
  });

  test('detects plain xml', () => {
    expect(getNlogoFileExtension('<?xml version="1.0"?><model version="NetLogo 6.4">')).toBe(
      'nlogox',
    );
  });

  test('falls back to nlogo3d on the setxyz heuristic', () => {
    expect(getNlogoFileExtension('to setup setxyz 1 2 3 end')).toBe('nlogo3d');
  });

  test('returns unknown when nothing matches', () => {
    expect(getNlogoFileExtension('just some text')).toBe('unknown');
  });
});

describe('parseNlogo', () => {
  test('reads the info tab from section 2 and the version from section 4', () => {
    const contents = nlogo([
      'code',
      'interface',
      '  ## WHAT IS IT?  ',
      'shapes',
      'NetLogo 5.0.4',
      'rest',
    ]);
    expect(parseNlogo(contents)).toEqual({
      netlogoVersion: '5.0.4',
      infoTab: '## WHAT IS IT?',
    });
  });

  test('returns nulls when there are too few sections', () => {
    expect(parseNlogo(nlogo(['code', 'interface', 'info']))).toEqual({
      netlogoVersion: null,
      infoTab: null,
    });
  });

  test('treats empty sections as null', () => {
    expect(parseNlogo(nlogo(['code', 'ui', '   ', 'shapes', '   ']))).toEqual({
      netlogoVersion: null,
      infoTab: null,
    });
  });

  test('strips the 3D prefix from the version section', () => {
    const contents = nlogo(['code', 'ui', 'info', 'shapes', 'NetLogo 3D 6.4.0']);
    expect(parseNlogo(contents).netlogoVersion).toBe('6.4.0');
  });

  test('keeps a version section that has no NetLogo prefix', () => {
    const contents = nlogo(['code', 'ui', 'info', 'shapes', '6.4.0']);
    expect(parseNlogo(contents).netlogoVersion).toBe('6.4.0');
  });

  test('treats a version section of only the NetLogo prefix as null', () => {
    const contents = nlogo(['code', 'ui', 'info', 'shapes', 'NetLogo']);
    expect(parseNlogo(contents).netlogoVersion).toBeNull();
  });

  test('rejects an implausibly long version section', () => {
    const contents = nlogo(['code', 'ui', 'info', 'shapes', 'x'.repeat(100)]);
    expect(parseNlogo(contents).netlogoVersion).toBeNull();
  });
});

describe('parseNlogox', () => {
  test('reads the version attribute and strips the NetLogo prefix', () => {
    const xml =
      '<?xml version="1.0"?><model name="a" version="NetLogo 6.4.0"><info>hi</info></model>';
    expect(parseNlogox(xml)).toEqual({ netlogoVersion: '6.4.0', infoTab: 'hi' });
  });

  test('strips the 3D prefix too', () => {
    const xml = '<model version="NetLogo 3D 6.2.2"><info>x</info></model>';
    expect(parseNlogox(xml).netlogoVersion).toBe('6.2.2');
  });

  test('unwraps CDATA in the info tab', () => {
    const xml =
      '<model version="NetLogo 6.4"><info><![CDATA[## WHAT IS IT?\n\nA model.]]></info></model>';
    expect(parseNlogox(xml).infoTab).toBe('## WHAT IS IT?\n\nA model.');
  });

  test('decodes xml entities in the info tab', () => {
    const xml =
      '<model version="NetLogo 6.4"><info>a &lt;b&gt; &amp;amp; &quot;c&quot;</info></model>';
    expect(parseNlogox(xml).infoTab).toBe('a <b> &amp; "c"');
  });

  test('handles attributes declared before version', () => {
    const xml = '<model xmlns="urn:x" name="w" version="NetLogo 6.3"><info>i</info></model>';
    expect(parseNlogox(xml).netlogoVersion).toBe('6.3');
  });

  test('returns nulls when the model element or info tab is missing', () => {
    expect(parseNlogox('<widgets/>')).toEqual({ netlogoVersion: null, infoTab: null });
    expect(parseNlogox('<model version="NetLogo 6.4"/>').infoTab).toBeNull();
  });

  test('treats a blank info tab as null', () => {
    expect(parseNlogox('<model version="NetLogo 6.4"><info>   </info></model>').infoTab).toBeNull();
  });

  test('does not throw on malformed xml', () => {
    expect(() => parseNlogox('<model version="NetLogo 6.4"><info>unclosed')).not.toThrow();
    expect(parseNlogox('<model version="NetLogo 6.4"><info>unclosed').infoTab).toBeNull();
  });
});

describe('parseNetlogoContents', () => {
  test('routes nlogox and nlogox3d to the xml parser', () => {
    const xml = '<model version="NetLogo 6.4"><info>i</info></model>';
    expect(parseNetlogoContents(xml, 'nlogox')).toEqual({ netlogoVersion: '6.4', infoTab: 'i' });
    expect(parseNetlogoContents(xml, 'nlogox3d')).toEqual({ netlogoVersion: '6.4', infoTab: 'i' });
  });

  test('routes every other format to the sectioned parser', () => {
    const contents = nlogo(['code', 'ui', 'info', 'shapes', 'NetLogo 5.0.4']);
    for (const format of ['nlogo', 'nlogo3d', 'unknown']) {
      expect(parseNetlogoContents(contents, format)).toEqual({
        netlogoVersion: '5.0.4',
        infoTab: 'info',
      });
    }
  });
});

describe('detectNetlogoVersion', () => {
  function file(filename: string, contents: string | Buffer) {
    return { filename, buffer: Buffer.isBuffer(contents) ? contents : Buffer.from(contents) };
  }

  test('strips the NetLogo prefix from a sectioned .nlogo file', () => {
    const contents = nlogo(['code', 'ui', 'info', 'shapes', 'NetLogo 6.4.0', 'preview']);
    expect(detectNetlogoVersion(file('model.nlogo', contents))).toBe('6.4.0');
  });

  test('strips the NetLogo prefix from a .nlogox file', () => {
    const xml = '<?xml version="1.0"?><model version="NetLogo 7.0.0"><info>i</info></model>';
    expect(detectNetlogoVersion(file('model.nlogox', xml))).toBe('7.0.0');
  });

  test('strips the 3D prefix from a .nlogox3d file', () => {
    const xml = '<?xml version="1.0"?><model version="NetLogo 3D 6.4.0"></model>';
    expect(detectNetlogoVersion(file('model.nlogox3d', xml))).toBe('6.4.0');
  });

  test('returns null for a NetLogo filename whose contents are not a NetLogo model', () => {
    expect(detectNetlogoVersion(file('model.nlogo', 'to setup clear-all end'))).toBeNull();
  });

  test('returns null for a sectioned file without a version section', () => {
    expect(detectNetlogoVersion(file('model.nlogo', nlogo(['code', 'ui'])))).toBeNull();
  });

  test('returns null for a file without a NetLogo extension', () => {
    const contents = nlogo(['code', 'ui', 'info', 'shapes', 'NetLogo 6.4.0']);
    expect(detectNetlogoVersion(file('notes.txt', contents))).toBeNull();
  });

  test('returns null for binary contents', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectNetlogoVersion(file('model.nlogox', png))).toBeNull();
  });

  test('reads the version when the info tab holds an entity that would make decoding throw', () => {
    const xml =
      '<?xml version="1.0"?><model version="NetLogo 7.0.0"><info>&#99999999;</info></model>';
    expect(() => parseNlogox(xml)).toThrow(RangeError);
    expect(detectNetlogoVersion(file('model.nlogox', xml))).toBe('7.0.0');
  });

  test('skips a model tag without a version that comes before the root tag', () => {
    const xml =
      '<?xml version="1.0"?><!-- <model> --><model name="w" version="NetLogo 7.0.0"></model>';
    expect(detectNetlogoVersion(file('model.nlogox', xml))).toBe('7.0.0');
  });

  test('reads a megabyte of unterminated model tags in linear time', () => {
    const crafted = '<?xml ' + '<model '.repeat(150_000);
    // An unbounded scan per occurrence takes about 30 s on this input; the bounded one takes milliseconds.
    const startedAt = performance.now();
    expect(detectNetlogoVersion(file('model.nlogox', crafted))).toBeNull();
    expect(performance.now() - startedAt).toBeLessThan(1000);
  });
});
