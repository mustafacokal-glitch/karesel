# KARESEL ENGINEERING RULES

Version: 2.0

## 1. Purpose

This document defines the engineering standards, software architecture principles and development rules that must be followed when modifying or extending the KARESEL codebase.

KARESEL is not a generic pixel art application.

It is a professional educational technology platform designed for children aged 5–10.

Every engineering decision must support the following goals:

* Educational effectiveness.
* Reliability.
* Performance.
* Maintainability.
* Scalability.
* Long-term product evolution.

---

# 2. Engineering Mission

The mission of KARESEL engineers is not simply to write new features.

The mission is to build a sustainable educational platform that:

* Helps teachers save preparation time.
* Provides high-quality learning materials.
* Works reliably on classroom devices.
* Can evolve for many years.

---

# 3. The Most Important Rule: Preserve Existing Value

Before changing any part of the system:

1. Analyze the current implementation.
2. Understand the existing design decisions.
3. Identify extension points.
4. Reuse existing modules whenever possible.

Never rewrite a working system only for architectural preference.

Prefer evolutionary improvements over revolutionary rewrites.

---

# 4. Development Workflow

Every implementation must follow this workflow.

## Step 1: Analysis

Before writing code:

* Explore affected files.
* Understand data flow.
* Identify dependencies.
* Estimate risks.

Create a Modification Plan including:

* Files to be changed.
* New files to be created.
* Expected impact.
* Performance considerations.
* Backward compatibility risks.

Implementation should begin only after approval.

---

## Step 2: Implementation

During development:

* Make small, isolated changes.
* Keep commits focused.
* Avoid unrelated refactoring.
* Preserve existing behavior.

---

## Step 3: Validation

Before finalizing:

* Run tests.
* Verify old functionality.
* Check performance.
* Review user experience.

---

# 5. Backward Compatibility

KARESEL must always maintain existing functionality.

The original image processing pipeline must remain available as:

## Classic Mode

New educational algorithms must be implemented as:

## Educational AI Mode

Users must always be able to switch between modes.

Never remove:

* Existing image processing capabilities.
* Existing export options.
* Existing user workflows.
* Existing settings.

---

# 6. Architecture Principles

Follow modern software engineering principles.

## Single Responsibility Principle

Each module should have one clear responsibility.

Good example:

ImageComplexityAnalyzer.ts

Responsibility:

Analyze image complexity.

Bad example:

MegaImageProcessor.ts

Responsibility:

Everything related to images.

---

## Open for Extension

New algorithms should be added as independent modules.

Avoid modifying stable components unless required.

---

## Loose Coupling

Modules should communicate through clear interfaces.

Avoid hidden dependencies.

---

## High Cohesion

Related logic should stay together.

Separate unrelated responsibilities.

---

# 7. TypeScript Standards

All new code must:

* Use strict typing.
* Avoid "any" whenever possible.
* Use interfaces and types for data exchange.
* Prefer immutable data structures.
* Use meaningful names.
* Keep functions small and focused.

---

Example:

Good:

ImageComplexityResult

Bad:

DataResult

---

# 8. Project Structure Rules

Follow the existing project structure.

New functionality should be organized clearly.

Example:

src/

engine/

analysis/

color/

grid/

filters/

quality/

workers/

components/

stores/

pdf/

Avoid creating random utility folders.

Every folder must have a clear responsibility.

---

# 9. Performance Rules

KARESEL must run smoothly on:

* Older tablets.
* Interactive whiteboards.
* Low-end computers.

Performance priorities:

1. Fast user response.
2. Efficient memory usage.
3. Stable long-running sessions.

Use:

* Web Workers for heavy calculations.
* Canvas optimizations.
* Cached calculations.
* Lazy loading.

Avoid:

* Unnecessary image duplication.
* Multiple full-resolution operations.
* Heavy dependencies without strong reasons.

---

# 10. Dependency Management

Before adding any new library ask:

"Can the existing system solve this problem?"

New dependencies must provide clear benefits.

Avoid:

* Large image processing frameworks.
* Duplicate libraries.
* Experimental packages with poor maintenance.

Prefer:

* Browser APIs.
* Existing project utilities.
* Lightweight solutions.

---

# 11. Image Processing Rules

Maintain and reuse existing strengths:

* CIELAB color distance algorithms.
* Existing pixel processing pipeline.
* Current optimization systems.

New algorithms should improve educational value, not only visual precision.

Priority order:

1. Child recognizability.
2. Shape preservation.
3. Educational simplicity.
4. Color clarity.
5. Performance.

---

# 12. State Management Rules

Use the existing Zustand architecture.

Rules:

* Keep stores focused.
* Avoid storing derived data when it can be calculated.
* Separate UI state from processing state.
* Avoid unnecessary global state.

---

# 13. User Interface Rules

The primary user is a teacher.

The interface must:

* Be understandable without technical knowledge.
* Require minimal configuration.
* Provide sensible defaults.

Avoid exposing terms such as:

* Edge detection.
* Morphological filtering.
* Color variance.

Instead use user-friendly terms:

* Simple.
* Balanced.
* Best Quality.

---

# 14. Accessibility Requirements

The application must support diverse learners.

Provide support for:

* Larger grid options.
* High contrast modes.
* Alternative color indicators.
* Different difficulty levels.

---

# 15. PDF Generation Standards

Generated worksheets must be:

* Easy to print.
* Easy to understand.
* Classroom ready.

Student pages should include:

* Name.
* Class.
* Date.
* Coding grid.
* Color legend.
* Instructions.

Teacher pages should include:

* Correct answer.
* Difficulty information.
* Estimated completion time.
* Educational recommendations.

---

# 16. Testing Standards

Every new feature requires testing.

Required tests:

## Unit Tests

Test individual modules.

Examples:

* Image complexity calculation.
* Color reduction.
* Grid recommendation.

---

## Integration Tests

Test interaction between modules.

Examples:

* Image processing pipeline.
* PDF generation.
* State updates.

---

## Regression Tests

Ensure previous features still work.

Target:

Minimum 80% test coverage for new modules.

---

# 17. Error Handling

The application must fail gracefully.

Every processing operation must:

* Validate inputs.
* Provide meaningful error messages.
* Allow recovery when possible.

Never silently ignore failures.

Never allow application crashes caused by user input.

---

# 18. Documentation Standards

Every new module must include:

* Purpose.
* Inputs.
* Outputs.
* Performance notes.
* Educational benefits.

Use JSDoc for public APIs.

Complex algorithms must explain:

* Why they exist.
* How they work.
* Why they are educationally valuable.

---

# 19. Code Review Checklist

Before completing any task, verify:

✓ Existing functionality works.

✓ Classic Mode remains unchanged.

✓ Educational AI Mode is isolated.

✓ No unnecessary dependency was added.

✓ TypeScript strict mode passes.

✓ Tests are successful.

✓ Performance targets are met.

✓ User interface remains simple.

✓ Educational goals are improved.

---

# 20. Final Engineering Principle

KARESEL is not developed to generate more accurate pixels.

KARESEL is developed to create better learning experiences.

Before accepting any code change, ask:

"Does this change help a teacher create better activities and help a child learn more successfully?"

If the answer is not clearly yes, redesign the solution.

---

END OF DOCUMENT
