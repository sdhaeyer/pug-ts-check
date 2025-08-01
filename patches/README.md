# Pug Patches for TypeScript Template Support

## 🎯 **Key Point: Patches are for Template Compilation, Not pug-ts-check**

**`pug-ts-check` works without these patches** - it can analyze your templates regardless. However, **your Pug templates need these patches to compile** when you use TypeScript annotations.

### The Problem
When you add TypeScript features to your Pug templates:
- `//@import` comments before `extends` 
- Typed mixin parameters like `mixin card(title: string, count?: number)`

**Standard Pug compiler will fail** with syntax errors.

### The Solution
Two minimal patches that make Pug compiler tolerant of TypeScript syntax:

1. **Comment parsing for `//@` annotations** - Allows comments in extended templates
2. **Typed mixin support** - Strips TypeScript annotations during compilation

## ⚠️ When You Need These Patches

**✅ You NEED patches if:**
- You use `//@import` or `//@expect` comments
- You write typed mixin parameters  
- You want your templates to actually render/compile

**❌ You DON'T need patches if:**
- You only run `pug-ts-check` for analysis
- You don't use TypeScript annotations in templates
- You're just testing the tool

## Required Patches

### Patch 1: Comment Support in Extended Templates (`pug-linker+4.0.0.patch`)

**Purpose:** Allows `//@` comments to appear before `extends` statements and in extended templates

**What it fixes:**
- Previously, Pug required `extends` to be the very first node
- Comments (including `//@` annotations) before `extends` would cause errors
- This patch allows comments to appear anywhere in extended templates

**Applied to:** `pug-linker@4.0.0` 

### Patch 2: Typed Mixin Parameter Support (`pug-code-gen+3.0.3.patch`)

**Purpose:** Strips TypeScript type annotations from mixin parameters during compilation

**What it fixes:**
- Allows mixins like: `mixin myMixin(name: string, age?: number = 25)`
- Strips TypeScript syntax to become valid JavaScript: `myMixin(name, age = 25)`
- Enables static type checking while maintaining runtime compatibility

**Applied to:** `pug-code-gen@3.0.3`

## Installation Instructions

### Option 1: Using patch-package (Recommended)

1. **Install patch-package:**
   ```bash
   npm install --save-dev patch-package
   ```

2. **Copy patches to your project:**
   ```bash
   # Copy the patch files from node_modules/pug-ts-check/patches/
   cp node_modules/pug-ts-check/patches/*.patch ./patches/
   ```

3. **Apply patches:**
   ```bash
   npx patch-package
   ```

4. **Add to package.json scripts:**
   ```json
   {
     "scripts": {
       "postinstall": "patch-package"
     }
   }
   ```

### Option 2: Manual Application

1. **Install standard Pug:**
   ```bash
   npm install pug@^3.0.2 pug-code-gen@^3.0.3 pug-linker@^4.0.0
   ```

2. **Apply patches manually:**
   - Find your `node_modules/pug-linker/index.js` and apply the linker patch
   - Find your `node_modules/pug-code-gen/index.js` and apply the code-gen patch

⚠️ **Warning:** Manual patches will be lost when `node_modules` is rebuilt!

## Quick Test

After applying patches, test with this Pug template:

```pug
//- @import { User } from "./types.js"
//- @expect user: User
extends layout

mixin userCard(name: string, age?: number = 18)
  .card
    h3= name
    p Age: #{age}

block content
  +userCard(user.name, user.age)
```

If patches are correctly applied:
- ✅ Comments before `extends` work
- ✅ Typed mixin parameters compile correctly
- ✅ `pug-ts-check` can analyze the template

## Troubleshooting

**Problem:** `Unexpected token ':'` in mixin
**Solution:** Apply the `pug-code-gen+3.0.3.patch`

**Problem:** `Only named blocks and mixins can appear at the top level`  
**Solution:** Apply the `pug-linker+4.0.0.patch`

**Problem:** `//@` comments not recognized
**Solution:** Ensure both patches are applied correctly

## Technical Details

These patches modify core Pug behavior:

1. **pug-linker:** Relaxes the strict ordering requirement for `extends` statements
2. **pug-code-gen:** Adds TypeScript parameter stripping in mixin compilation

Both patches are minimal, targeted changes that maintain full backward compatibility with existing Pug templates.

---

**Note:** We're working on a more permanent solution that doesn't require manual patching. Stay tuned for updates!
