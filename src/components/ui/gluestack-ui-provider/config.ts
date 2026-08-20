import { vars } from 'nativewind';

// Raw color values - update these and they sync everywhere. Swapped from
// gluestack's generic black-and-white template defaults to this app's
// actual emerald brand (theme/glass.ts's BRAND.emerald/emeraldDeep,
// COLORS.ink/subtle/border/canvas), so gluestack components read as this
// app's brand from day one instead of needing a second retheming pass.
// App.tsx pins mode="light" (the rest of the app has no dark-mode
// handling anywhere), so `dark` here is unused today but still filled in
// with a real emerald-tinted dark palette rather than left as boilerplate.
export const colors = {
  light: {
    '--primary': '31 174 100',
    '--primary-foreground': '250 250 250',
    '--card': '255 255 255',
    '--secondary': '245 247 246',
    '--secondary-foreground': '17 24 39',
    '--background': '247 250 248',
    '--popover': '255 255 255',
    '--popover-foreground': '17 24 39',
    '--muted': '245 247 246',
    '--muted-foreground': '107 114 128',
    '--destructive': '239 68 68',
    '--foreground': '17 24 39',
    '--border': '229 231 235',
    '--input': '229 231 235',
    '--ring': '31 174 100',
    '--accent': '229 246 236',
    '--accent-foreground': '15 122 61',
  },
  dark: {
    '--primary-foreground': '17 24 39',
    '--primary': '76 175 80',
    '--card': '23 23 23',
    '--secondary': '38 38 38',
    '--secondary-foreground': '250 250 250',
    '--background': '10 10 10',
    '--popover': '23 23 23',
    '--popover-foreground': '250 250 250',
    '--muted': '38 38 38',
    '--muted-foreground': '161 161 161',
    '--destructive': '255 100 103',
    '--foreground': '250 250 250',
    '--border': '46 46 46',
    '--input': '46 46 46',
    '--accent': '38 38 38',
    '--accent-foreground': '250 250 250',
    '--ring': '76 175 80',
  },
};

// Config for nativewind vars() - used by provider
export const config = {
  light: vars(colors.light),
  dark: vars(colors.dark),
};
