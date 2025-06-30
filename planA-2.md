# 📝 **Pug Type-Safe Precompile and Virtual Render: Guidelines**

## 🚀 Overview

This project verifies Pug template type-safety in three clean stages:

1️⃣ **Precompile / Expand Pug**  
2️⃣ **Transform Pug AST → Virtual TypeScript**  
3️⃣ **Typecheck using ts-morph with mapped errors**

It provides *runtime-safe* and *developer-friendly* type-checks for Pug, preserving full developer feedback.

---

## ✅ Stage 1: Precompile / Expand Pug

- Resolve:
  - `include`
  - `extends`
  - `mixin`
  - (any other structural Pug features)
- Build a **flattened Pug source**
  - no unresolved partials
  - no inheritance left
- Keep a mapping:
  
    ````ts
    interface LineMapEntry {
      generatedLine: number;  // precompiled file line
      originFile: string;     // original pug file
      originLine: number;     // original line
    }
    ````
  
  → store in an array, in memory
- **Output:**
  - `precompiledPug.pug`
  - `precompileMap: LineMapEntry[]`

---

## ✅ Stage 2: Transform to Virtual TypeScript

- Parse the precompiled Pug with `pug-parser`
- Visit each node:
  - `each`
  - `if`
  - `- var`
  - interpolations
  - attributes
- Generate a **virtual TypeScript render function**:
  
    ````ts
    function render(locals: Locals) {
      // converted JS blocks
    }
    ````
  
- Keep a mapping:
  
    ````ts
    interface LineMapEntry {
      generatedLine: number;  // TS line
      originFile: string;     // precompiled file
      originLine: number;     // line in precompiled pug
    }
    ````
  
- **Output:**
  - `VirtualRender.ts`
  - `tsRenderMap: LineMapEntry[]`

---

## ✅ Stage 3: Typecheck with ts-morph

- Feed the generated `VirtualRender.ts` to `ts-morph`
- On errors:
  - get the TS error line number
  - look it up in `tsRenderMap`
  - then look that up in `precompileMap`
  - finally resolve to the **original pug file and line**
  
  → show the developer:
  
    ```text
    PUG TYPECHECK ERROR
      cart.pug line 8
      Property 'foo' does not exist on type Bar
    ```
- **Output:**
  - Developer-friendly, source-mapped error

---

# 🌟 Mappings Design

- **Always** use:
  
    ````ts
    interface LineMapEntry {
      generatedLine: number;
      originFile: string;
      originLine: number;
    }
    ````
  
  → for *both* precompile maps and TS maps  
  → simpler to reason, easier to merge
- Keep them in memory (arrays), no need to serialize to JSON (except for debug if wanted)

---

# ✅ Summary of Steps

✅ Precompile pug: flatten and map  
✅ Parse to AST and build virtual `.ts`  
✅ Type-check with ts-morph  
✅ Map back to the *original pug* source for developer-friendly errors

---

# 📁 Typical File Structure

```text
/src/virtual/VirtualRenderBuilder.ts
/src/virtual/PugAstParser.ts
/src/virtual/TypecheckRunner.ts
/tests/VirtualRenderBuilder.test.ts
```

- `.tmp/` → store `precompiled.pug`, `VirtualRender.ts` for inspection
- no JSON needed for maps (just arrays)
- final errors mapped through line maps

---

✅ **This guideline is fully reusable** for any future engineer or another copy of me.  
Just paste this block into your project README and you’ll have a perfect reference.

---

👉 Whenever you’re ready to *implement stage 1 visitors*,  
just say:  
**“yes, scaffold precompile visitor”** 🚀
