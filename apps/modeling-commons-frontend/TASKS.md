- Add ClientOnly and page rules when appropriate
  - This is when the content of the page is not needed for pre-render, like uploading a model or editing a model. This is to prevent hydration errors and to speed up the build process.

- Normalize error handling, toasts, throws, error shows by refactoring then add observability.

- Fix any hydration errors (and their causes, not just the symptoms) that are present in the app.
