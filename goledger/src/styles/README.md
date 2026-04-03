# Sass Structure

This project uses a layered Sass structure to keep style modules small and reusable.

- `abstracts/`: design tokens and generic mixins (`_variables.scss`, `_mixins.scss`)
- `base/`: global foundations such as reset and element defaults
- `components/`: reusable UI building blocks (e.g. buttons)
- `pages/`: page-level layout/copy mixins used by CSS Modules

Guidelines:
- Keep component/page files mixin-oriented and side-effect free.
- In CSS Modules, prefer `@use` + `@include` for repeated patterns.
- Keep theme values centralized in `abstracts/_variables.scss`.
