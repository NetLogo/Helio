export default defineAppConfig({
  ui: {
    colors: {
      primary: "royal-blue",
      secondary: "coral",
      neutral: "neutral",
    },

    container: {
      base: "max-w-[var(--max-width-ch)] py-12 mx-auto",
    },

    ...Object.fromEntries(
      ["input", "textarea", "inputMenu", "selectMenu", "inputDate", "inputNumber", "inputTags"].map(
        (component) => {
          return [
            component,
            {
              slots: {
                root: "w-full",
              },
              variants: {
                variant: {
                  outline: "bg-neutral-darkest/5 focus:bg-neutral-light/5",
                },
                size: {
                  md: {
                    root: "gap-5",
                    base: "px-3 py-2 gap-2 leading-7",
                    leading: "px-4",
                    trailing: "px-4",
                  },
                },
              },
            },
          ];
        },
      ),
    ),

    checkbox: {
      variants: {
        color: {
          primary: {
            base: "bg-neutral-darkest/5",
            indicator: "bg-neutral-darkest",
          },
        },
        variant: {
          card: {
            root: "rounded-none bg-neutral-darkest/5 [&_p:first-of-type]:mb-0",
            base: "rounded-none",
          },
        },
      },
    },

    radioGroup: {
      variants: {
        color: {
          primary: {
            base: "bg-neutral-darkest/5",
            indicator: "bg-neutral-darkest",
          },
        },
        variant: {
          card: {
            item: "rounded-none bg-neutral-darkest/5 [&_p:first-of-type]:mb-0",
          },
        },
      },
    },

    switch: {
      variants: {
        color: {
          primary: {
            base: "data-[state=checked]:bg-neutral-darkest",
          },
        },
        size: {
          md: {
            thumb: "scale-[80%]",
          },
        },
      },
    },

    tooltip: {
      slots: {
        content: "text-sm p-4 h-fit rounded",
      },
    },

    card: {
      variants: {
        variant: {
          subtle: {
            root: "border border-royal-blue-lightest",
            body: "bg-neutral-lightest",
          },
        },
      },
    },

    pageHero: {
      slots: {
        title: "text-[var(--h1-size)] font-[500] leading-[var(--line-height-heading)]",
      },
    },

    button: {
      slots: {
        base: "hover:cursor-pointer",
      },
      defaultVariants: {
        variant: "outline",
        size: "md",
      },
      variants: {
        size: {
          xs: "px-[1.25rem] py-2 gap-2 text-sm",
          sm: "px-[1.25rem] py-2 gap-2 text-md",
          md: "px-6 py-[0.625rem] gap-3 text-md",
          lg: "px-5 py-2 gap-2",
        },
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "outline",
          class:
            "ring-neutral-darkest/15 text-highlighted hover:bg-neutral-light/5 focus-visible:ring-neutral-darkest/25",
        },
        {
          square: true,
          size: "md",
          class: "p-[0.625rem] text-[1.5rem]",
        },
        {
          square: true,
          size: "sm",
          class: "p-[0.6rem] text-[1.3rem] ",
        },
      ],
    },
  },
});
