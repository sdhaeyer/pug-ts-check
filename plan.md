# ✅ Pug + TypeScript Type Checking Tasks

## Phase 1: A - Independent Pug TypeScript Checker

1. **Parser setup**
   - [ ] Parse `.pug` file contents
   - [ ] Extract `@import` and `@expect` comments from the top
   - [ ] Parse the JSON-ish contents of `@expect`

2. **Pug variable scanning**
   - [ ] Use `pug-parser` or `pug-lexer` to get AST
   - [ ] Collect all variables used in:
     - interpolations (`#{}`)
     - conditions (`if`)
     - loops (`each`)
     - attributes

3. **Type linking**
   - [ ] Load TypeScript project with `ts-morph`
   - [ ] Resolve the imported type names
   - [ ] Validate that the type definitions exist
   - [ ] Cache type locations to avoid repeat parsing

4. **Validation**
   - [ ] Match Pug variables against the expected type
   - [ ] Report missing required variables
   - [ ] Report unknown variables
   - [ ] Support optional fields (`cart?`)

5. **Reporting**
   - [ ] Nice console output with line numbers and template name
   - [ ] Optional JSON output for CI

6. **Watch mode**
   - [ ] Re-run on pug file change
   - [ ] Re-run on .ts file change
   - [ ] Print quick summary

7. **CLI**
   - [ ] `pug-ts-check views/**/*.pug`
   - [ ] flags: `--watch`, `--json`, `--strict`

---

## Phase 2: B - Correct Pug Usage Checker Within TypeScript

1. **TypeScript render usage scan**
   - [ ] Find all `res.render()` calls in source
   - [ ] Parse their arguments (template name + locals)

2. **Link to pug contract**
   - [ ] Resolve which pug template file is referenced
   - [ ] Parse its `@expect` block
   - [ ] Compare the passed locals object to the contract

3. **Validation**
   - [ ] Report missing fields in render data
   - [ ] Report type mismatches
   - [ ] Optional strict mode for no extra fields

4. **Reporting**
   - [ ] Show file/line of bad render calls
   - [ ] Print nice summary
   - [ ] Optional JSON mode for CI

5. **CLI**
   - [ ] `pug-ts-usage-check src/**/*.ts`
   - [ ] flags: `--strict`, `--json`

---

## Phase 3: (optional) Runtime middleware

- [ ] Wrap `res.render` in express
- [ ] Load pug template contract at runtime
- [ ] Check the locals object
- [ ] Throw or warn on mismatch
- [ ] Disable in production

---

## Names

- **A** = Independent Pug TypeScript Checker
- **B** = Correct Pug Usage Checker Within TypeScript

---

> Ready to get started, wise one — pick any task and I will help you write its first lines of code!
