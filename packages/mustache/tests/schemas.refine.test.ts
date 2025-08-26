import { PageDeclarationSchema } from '../src/schemas';

describe('PageDeclarationSchema refine function coverage', () => {
  it('should trigger the refine function for additional key validation', () => {
    const validDataWithAdditionalKeys = {
      title: 'Test Page',
      customField: 'custom value',
      anotherCustomField: 123,
    };

    // This should pass because the refine function allows additional keys
    const result = PageDeclarationSchema.parse(validDataWithAdditionalKeys);
    expect(result.title).toBe('Test Page');
    expect(result.extension).toBe('.md'); // default value
  });

  it('should execute the refine function validation logic', () => {
    const dataWithUnknownKeys = {
      title: 'Valid Title',
      unknownProperty: 'should be allowed',
      metadata: { custom: true },
    };

    // This triggers the refine function to execute
    expect(() =>
      PageDeclarationSchema.parse(dataWithUnknownKeys)
    ).not.toThrow();
  });

  it('should handle edge cases in the refine function', () => {
    // Empty object should pass
    expect(() => PageDeclarationSchema.parse({})).not.toThrow();

    // Object with only unknown keys should pass
    const unknownOnly = {
      totallyCustomField: 'value',
      anotherCustom: 42,
      thirdCustom: { nested: 'object' },
    };
    expect(() => PageDeclarationSchema.parse(unknownOnly)).not.toThrow();
  });

  it('should validate the complete schema structure with refine', () => {
    const completeValidData = {
      title: 'Complete Test',
      extension: '.md',
      language: 'en',
      output: true,

      // Unknown/additional fields that should be allowed
      customMetadata: { version: '1.0' },
      additionalProperty: 'allowed',
    };

    const result = PageDeclarationSchema.parse(completeValidData);
    expect(result.title).toBe('Complete Test');
    expect(result.extension).toBe('.md');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('extension');
  });

  it('should exercise the refine function with various key combinations', () => {
    // Test different scenarios to ensure the refine function is called
    const testCases = [
      { onlyCustomKeys: 'value' },
      { title: 'known', custom: 'mixed' },
      { extension: '.html', language: 'es', custom: true },
      { custom1: 1, custom2: 2, custom3: 3 },
    ];

    testCases.forEach((testCase) => {
      expect(() => PageDeclarationSchema.parse(testCase)).not.toThrow();
    });
  });

  it('should execute the refine function for function coverage', () => {
    // This test specifically targets the refine function execution
    // to ensure we get function coverage
    const testData = {
      // Mix of known and unknown keys to trigger refine function
      title: 'Function Coverage Test',
      description: 'Testing function coverage',
      unknownKey1: 'value1',
      unknownKey2: 'value2',
      complexUnknown: {
        nested: {
          deeply: true,
          array: [1, 2, 3],
        },
      },
    };

    const result = PageDeclarationSchema.parse(testData);
    expect(result.title).toBe('Function Coverage Test');
    expect(result.description).toBe('Testing function coverage');
  });
});
