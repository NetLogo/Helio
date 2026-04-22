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

    avatar: {
      slots: {
        root: "bg-neutral-lighter",
      },
    },

    alert: {
      slots: {
        root: "rounded-md px-4 py-3",
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "subtle",
          class: {
            root: "bg-[#E0F5FF] text-royal-blue-darker ring-[#CBEFFF]",
          },
        },
        {
          color: "secondary",
          variant: "subtle",
          class: {
            root: "bg-[#FEF6E3] text-royal-blue-darker ring-coral-lighter text-coral-darker",
          },
        },
        {
          color: "neutral",
          variant: "subtle",
          class: {
            root: "bg-neutral-lightest text-royal-blue-darker ring-neutral-lighter text-neutral-darkest",
          },
        },
      ],
    },

    badge: {
      slots: {
        base: "rounded-lg px-4 py-3",
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "subtle",
          class: {
            base: "bg-[#E0F5FF] text-royal-blue-darker ring-[#CBEFFF]",
          },
        },
        {
          color: "secondary",
          variant: "subtle",
          class: {
            base: "bg-[#FEF6E3] text-royal-blue-darker ring-coral-lighter text-coral-darker",
          },
        },
        {
          color: "neutral",
          variant: "subtle",
          class: {
            base: "bg-neutral-lightest text-royal-blue-darker ring-neutral-lighter text-neutral-darkest",
          },
        },
      ],
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
            root: "rounded-md bg-neutral-darkest/5 [&_p:first-of-type]:mb-0",
            base: "rounded-md",
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
            item: "rounded-md bg-neutral-darkest/5 [&_p:first-of-type]:mb-0",
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

    pageCard: {
      variants: {
        variant: {
          subtle: {
            root: "border border-royal-blue-lightest bg-elevated/30",
          },
        },
      },
    },

    form: {
      base: "space-y-6!",
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
        variant: {
          link: "p-0",
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
        {
          square: true,
          size: "xs",
          class: "p-[0.6rem] text-[1rem] ",
        },
      ],
    },

    table: {
      slots: {
        root: "ring ring-neutral-darkest/15 rounded-sm",
        base: "mb-0",
      },
    },

    modal: {
      slots: {
        header: "justify-between gap-4",
        title: "line-clamp-1 text-ellipsis text-h6 font-[500]!",
        close: "p-2 relative inset-0",
      },
    },

    tabs: {
      slots: {
        content: "pt-4",
      },
    },

    fileUpload: {
      defaultVariants: {
        color: "primary",
        variant: "outline",
      },
      slots: {
        root: "cursor-pointer group/file ",
        base: "border-0 border-dashed-stylized py-10 px-5",
        icon: "text-4xl text-neutral-darkest",
        label: "font-semibold text-md leading-relaxed",
      },
      compoundVariants: [
        {
          color: "primary",
          variant: "outline",
          class: {
            base: "bg-royal-blue-lightest/20 hover:bg-royal-blue-lightest/50 data-[dragging=true]:bg-royal-blue-lightest/80",
          },
        },
      ],
    },
  },
});
