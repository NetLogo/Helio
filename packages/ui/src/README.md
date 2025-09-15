# NetLogo UI Library

## Installation

1. Add `@repo/tailwind-config` and `@repo/ui` to your app

```bash
yarn workspace <my-project> add @repo/tailwind-config @repo/ui
```

2. Create a `globals.scss` file with the following imports

```scss
// Imports classes from @repo/ui library
@import '@repo/ui/styles.scss';
// Imports Tailwind CSS; Imports NetLogo variables, updates Tailwind CSS variables
@import '@repo/tailwind-config';

// The `website` layer is defined higher than any Tailwind CSS
// layer (@layer theme, base, components, utilities, website)
@layer website {
  // Adds NetLogo website theme (docs)
  @import '@repo/tailwind-config/scss/docs-theme.scss';
}
```

3. Add `tailwindCSS` to your project. See the Tailwind CSS website for
   instructions.

## Guidelines for Creating Components

1. Scope CSS using either Tailwind CSS or `*.module.scss` files.
2. Use the `Client` suffix to indicate Client only components For example, in
   `src/layout/navbar/Navbar.tsx` we have:

```tsx
const Navbar = ({
  id,
  children,
  brand,
  brandHref,
  className,
  show = true,
  blurBackdrop = 0,
  ...rest
}: NavbarProps) => {
  return (
    <nav
      className={cn(
        styles.container,
        !show && styles.hide,
        Boolean(blurBackdrop) && styles.blurBackdrop,
        className
      )}
      style={{
        ...cssVariable('--blur-backdrop', blurBackdrop),
        ...(rest.style || {}),
      }}
      id={id}
      data-show={show}
      {...rest}
    >
      <Navbar.MenuToggle id={id} />
      <Navbar.Row>
        <Navbar.AnchorContainer id={id}>
          {brand && (
            <Navbar.BrandContainer href={brandHref}>
              {brand}
            </Navbar.BrandContainer>
          )}
        </Navbar.AnchorContainer>
        {children}
      </Navbar.Row>
      {children}
    </nav>
  );
};

Navbar.Client = ({ options = {}, ...rest }: NavbarClientProps) => {
  const uiProps = useNavbar(options);
  return <Navbar {...rest} {...uiProps} />;
};
```

The `Navbar.Client` supports JavaScript interactions not offered by `Navbar`. 3.
Wrap client code in `isWindowDefined()` check and warn if it fails but do NOT
throw. For example, in `src/layout/navbar/Navbar.tsx`, we see the
`Navbar.ItemClient`, which supports debounced hover state:

```tsx
Navbar.ItemClient = (props: NavbarMenu) => {
  if (!isWindowDefined()) {
    return <Navbar.Item {...props} />;
  }

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { onMouseEnter, onMouseLeave } = useDebouncedHover(
    () => setDropdownOpen(true),
    () => setDropdownOpen(false)
  );

  return (
    <Navbar.Item
      {...props}
      dropdownOpen={dropdownOpen}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  );
};
```

4. Always pass through `props` to the relevant top-level HTML tag. This includes
   `className` and `styles`.

```tsx
Navbar.AnchorContainer = ({
  id,
  children,
  className,
  ...rest
}: {
  id: string;
  children?: React.ReactNode;
} & React.HTMLProps<HTMLDivElement>) => (
  <div {...rest} className={cn(styles.anchor, className)}>
    <label className={styles.hamburger} htmlFor={id + '-toggle'}>
      {' '}
      <span></span>
      <span></span>
      <span></span>{' '}
    </label>
    {children}
  </div>
);
```

> `cn` does not require `className` to be defined.
