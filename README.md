# pug-check-ts

A dev-only static type checker to connect TypeScript types to Pug templates.

## Features

- check Pug files for correct variable types
- verify how your render calls pass locals
- no runtime slowdown

## Usage

```bash
npm run check:pug
npm run check:usage
```

or

```bash
npx pug-check-ts check-pug views/**/*.pug
```
