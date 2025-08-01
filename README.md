Hi, most of the README, is or was generated with AI, lots of the code too, or definitely with help. 

Just that you know. 

I became a bit of a pug lover ... :) the dog ;) , and needed a Typescript validation. Pug was new to me. Node as well, I have been a long time in Javascript ... I am getting older. But so, Typescript was new as well, and I fell a bit in love with Typescript, Pug, and Node/npm. 

So basically, this is a Node npm package, that parses pug templates ... to see if what you're using is validly typed (scripted). 

Which means if you change your code ... the program will check if everything in your pugs is still consistent. Lots of updates are possible; this is a working version that was handy for me ... so I stopped there a bit. Also not working on the project anymore where I was using it. Once I'm back there I will ... continue to improve. 

I also created a simple VS-extension so you can (at least) click through on the import links above in the page to go to the classes/interfaces you defined. Might make that public as well later ... 

Kr, Sam 2025-07-31



# 🧩 pug-ts-check

**`pug-ts-check`** is a **static TypeScript checker for Pug templates**. It performs offline analysis of your `.pug` views to ensure that the locals and mixin arguments match their expected TypeScript types.

---

## 🚀 Purpose

When rendering Pug templates in a Node.js/Express app, mismatches between what's passed and what the view expects often lead to **runtime errors**.

`pug-ts-check` solves this by:

- 🧠 Analyzing your `.pug` files statically
- 🛠️ Validating expected `locals` and `mixin` arguments
- 🧾 Generating a shared `viewlocals.d.ts` file
- 🧘 Improving development experience (autocomplete, hover, etc.)
- ❌ Preventing bugs before runtime

> 🧼 This is a **static development tool only**. It does not run at runtime and does not modify your compiled templates.

---

## 📦 Installation

```bash
npm install pug-ts-check --save-dev
```

```bash
npm install pug-ts-check --save-dev
```

## ⚠️ **Important: Pug Patches for TypeScript Annotations**

**These patches are NOT required for `pug-ts-check` to work** - the tool can analyze your templates without them. However, **the patches ARE required for your Pug templates to compile correctly** when you add TypeScript annotations like `//@import` and typed mixin parameters.

### Why You Need the Patches

`pug-ts-check` reads your `.pug` files and validates the TypeScript annotations, but when you actually render your templates (in development or production), **standard Pug will fail to compile** templates with:

- `//@` comments before `extends` statements
- Typed mixin parameters like `mixin card(title: string, count?: number)`

**Without patches:** ❌ Your templates won't compile  
**With patches:** ✅ Your templates compile normally + get type checking

### Quick Setup with patch-package (Recommended)

1. **Install dependencies:**
   ```bash
   npm install pug-ts-check --save-dev
   npm install patch-package --save-dev
   npm install pug@^3.0.2 pug-code-gen@^3.0.3 pug-linker@^4.0.0
   ```

2. **Copy patch files:**
   ```bash
   cp node_modules/pug-ts-check/patches/*.patch ./patches/
   ```

3. **Apply patches:**
   ```bash
   npx patch-package
   ```

4. **Auto-apply on install:**
   ```json
   // Add to your package.json scripts:
   "postinstall": "patch-package"
   ```

### What the patches do:

**Patch 1: Comment Support (`pug-linker`)**
- **Problem:** Pug doesn't allow comments before or at the same level as `extends` nodes
- **Solution:** Allow `//@` comments in extended templates (before `extends`)
- **Result:** Your `//@import` and `//@expect` comments work in extended templates

*Note: These comments currently get included in the final HTML render - this might be changed in future.*

**Patch 2: Typed Mixin Support (`pug-code-gen`)**  
- **Problem:** Pug can't handle TypeScript syntax in mixin parameters
- **Solution:** Strip TypeScript annotations from mixins during compilation
- **Example:** `mixin card(title: string, count?: number)` → `mixin card(title, count)`
- **Result:** You can write typed mixins that both compile AND get type-checked

### The Bottom Line

Both patches ensure that **when you add TypeScript annotations, the Pug compiler doesn't freak out and can still generate HTML**. The `pug-ts-check` tool works with or without patches, but your templates need the patches to actually render. 


📖 **Detailed instructions:** See [`patches/README.md`](./patches/README.md)

### Future: Automated Solution

We are working on providing pre-patched Pug packages or a patch automation tool to eliminate this manual step.

**Current Status:** ⚠️ Manual patches required  
**Planned:** ✅ Automated patch application or pre-patched packages

---

## ⚙️ Configuration: `pug.tsconfig.json`

```json
{
  "tmpDir": "./src/.tmp",
  "projectPath": "../../srv/apps/string-portrait/code/",
  "pugPaths": ["./src/views"],
  "logLevel": "info",
  "viewsRoot": "./src/views",
  "typesPath": "./src/types"
}
```

### Key Fields

| Field         | Description                                                                 |
|---------------|-----------------------------------------------------------------------------|
| `tmpDir`      | Temporary directory used for generated `.ts` files                          |
| `projectPath` | Path to your app's `tsconfig.json` (needed for type resolution)             |
| `pugPaths`    | One or more directories where `.pug` files live                             |
| `logLevel`    | Logging verbosity (`info`, `warn`, `error`, `debug`)                        |
| `viewsRoot`   | Base directory for resolving included views (typically `views` folder)      |
| `typesPath`   | Where `viewlocals.d.ts` will be generated                                   |

---

## 💡 Declaring Imports and Expected Locals

Use `//@` comments to describe what the view expects:

```pug
//@ import type { User, Cart } from '../types/models.js'
//@ expect { user: User, cart: Cart }

extends layout

block content
  +orderOverview(cart, user)
  p Welcome #{user.name} to your order history!
```

---

## ➕ Mixins with Typed Parameters

You can add type-safe mixin definitions as well:

```pug
//@ import type { Cart } from '../types/models.js'
//@ import type { User } from '../types/models.js'
//@ expect {}

mixin orderOverview(cart: Cart, user: User)
  ul
    each item in cart.items
      li= item.product.name + ' - ' + item.quantity + ' pcs'
  if cart.items.length > 0
    p Total items: #{cart.items.length}
  else
    p Your cart is empty.
```

The checker verifies all usages of `+orderOverview(...)` and enforces correct argument types.

---

## 🧪 Running the CLI

```bash
npx pug-ts-check
```

### Options

```bash
npx pug-ts-check [path] [options]
```

| Flag              | Description                                  |
|-------------------|----------------------------------------------|
| `[path]`          | File or folder to analyze (optional)         |
| `--watch`         | Re-run when `.pug` files change              |
| `--verbose`       | Show detailed output                         |
| `--silent`        | Suppress logs                                |
| `--tmpDir <dir>`  | Override temp directory                      |
| `--projectPath`   | Path to `tsconfig.json`                      |
| `--pugTsConfig`   | Use alternative config file (default: `pug.tsconfig.json`) |

---

## 🧾 Output

After running, you'll get a file like:

```ts
// src/types/viewlocals.d.ts

declare namespace ViewLocals {
  interface Index { title: string }
  interface CartHistory { user: User; cart: Cart }
  ...
}
```

Use this for type safety in your controllers.

---
## 🧩 Express Integration with `typedRender`

To enforce view-local types at runtime, you can extend Express's `res` object with a `typedRender` helper.

### 1. Add a Type Augmentation

Create a file like `express.d.ts` in your project:

```ts
import "express";

declare module "express-serve-static-core" {
  interface Response {
    typedRender<K extends keyof ViewLocals>(
      view: K,
      locals: ViewLocals[K]
    ): void;
  }
}
```

### 2. Add the Runtime Implementation

In your app setup code (e.g. `app.ts`):

```ts
app.use((req, res, next) => {
  res.typedRender = function(view, locals) {
    return res.render(view, locals);
  };
  next();
});
```

### 3. Use in Controllers

You now get full type safety when rendering views:

```ts
res.typedRender("pages/home", {
  user: currentUser,
  cart: currentCart
});
```

## 📂 Typical Project Structure

```
project-root/
├── src/
│   ├── views/                # Pug templates
│   ├── types/
│   │   └── viewlocals.d.ts   # Generated typings
│   └── .tmp/                 # Temp output (safe to ignore)
├── pug.tsconfig.json         # Static checker config
├── tsconfig.json             # TypeScript config
```

---

## ✅ Features

- ✅ Static TypeScript checking for Pug views
- ✅ Typed `locals` and mixin parameters
- ✅ Autogenerated `viewlocals.d.ts`
- ✅ Watch mode for live feedback
- ✅ Simple CLI integration
- ✅ IDE-friendly annotations (`//@ import`, `//@ expect`)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🧠 Credits

Created with ❤️ to bring modern type safety to template rendering.  
Contributions, suggestions, and integrations welcome!
