KARESEL SYSTEM ARCHITECTURE DOCUMENT (SAD)

Version: 2.0

1. System Overview

KARESEL is a browser-based educational pixel coding platform built with modern web technologies.

The application converts images into child-friendly pixel coding worksheets using intelligent image processing, educational optimization and printable worksheet generation systems.

The architecture must support:

Long-term maintainability.
Educational AI expansion.
High performance on low-end classroom devices.
Modular development.
Future cloud-based features.
2. High-Level Architecture

The system consists of six main layers:

1. Presentation Layer

Responsible for user interaction.

Components:

React UI Components.
Pages and Layouts.
Toolbar and Settings Panels.
Preview Components.
Dialog Systems.

Responsibilities:

Collect user input.
Display processing results.
Provide educational options.
Keep the interface simple for teachers.
2. Application State Layer

Technology:

Zustand

Responsibilities:

Global application state.
User preferences.
Image processing settings.
Current worksheet information.
UI state.

Rules:

Keep stores small and focused.
Avoid storing calculated data.
Prefer selectors for derived values.
3. Image Processing Engine

The core processing system.

Main responsibilities:

Image analysis.
Grid generation.
Color optimization.
Shape preservation.
Pixel conversion.
4. AI Educational Intelligence Layer

New KARESEL v2.0 intelligence system.

Components:

Child Vision Engine.
Smart Grid Selector.
Educational Color Intelligence.
Difficulty Analyzer.
AIQES Quality Engine.

This layer enhances the traditional pixel generation process.

5. Worksheet Generation Layer

Responsible for creating educational materials.

Outputs:

Student worksheets.
Teacher answer sheets.
PDF documents.
Printable layouts.
6. Infrastructure Layer

Supports all technical operations.

Includes:

File management.
Caching.
Web Workers.
Error handling.
Configuration management.
3. Proposed Project Structure

The project should evolve toward the following structure:

src/
│
├── components/
│   ├── ui/
│   ├── canvas/
│   ├── dialogs/
│   └── panels/
│
├── pages/
│
├── stores/
│
├── engine/
│   │
│   ├── analysis/
│   │   ├── ImageComplexityAnalyzer.ts
│   │   └── ObjectDetector.ts
│   │
│   ├── grid/
│   │   └── SmartGridSelector.ts
│   │
│   ├── color/
│   │   ├── EducationalPaletteOptimizer.ts
│   │   └── ColorDistance.ts
│   │
│   ├── transform/
│   │   ├── PixelConverter.ts
│   │   └── ShapePreservationEngine.ts
│   │
│   ├── quality/
│   │   ├── AIQES.ts
│   │   ├── ObjectRecognizabilityEvaluator.ts
│   │   ├── ComplexityEvaluator.ts
│   │   └── MotivationPredictor.ts
│   │
│   └── types/
│
├── pdf/
│
├── workers/
│
├── utils/
│
└── config/
4. Image Processing Pipeline

KARESEL must maintain two independent pipelines.

Classic Mode

Purpose:

Preserve the existing behavior.

Pipeline:

Image Upload
      ↓
Resize
      ↓
Grid Creation
      ↓
Color Reduction
      ↓
Pixel Conversion
      ↓
Worksheet Export

Rules:

Existing algorithms should not be removed.
Existing users must receive the same results.
Educational AI Mode

Purpose:

Generate the best educational experience.

Pipeline:

Image Upload
      ↓
Image Analysis
      ↓
Object Recognition Analysis
      ↓
Complexity Evaluation
      ↓
Smart Grid Selection
      ↓
Educational Color Optimization
      ↓
Shape Preservation
      ↓
Pixel Conversion
      ↓
AIQES Evaluation
      ↓
Automatic Optimization Loop
      ↓
Worksheet Generation
5. Child Vision Engine Architecture

The Child Vision Engine evaluates whether an image is suitable for a child.

Submodules:

Object Analyzer

Measures:

Main subject visibility.
Object boundaries.
Background noise.
Complexity Analyzer

Measures:

Detail density.
Edge complexity.
Visual overload.
Age Suitability Analyzer

Calculates:

Recommended age.
Recommended grid size.
Estimated completion time.
6. AIQES Integration Architecture

AIQES is the final quality control layer.

Workflow:

Generated Worksheet
          ↓
AIQES Evaluation
          ↓
Quality Score Calculation
          ↓
Improvement Suggestions
          ↓
Automatic Optimization
          ↓
Final Worksheet

Rules:

Every evaluator returns a score between 0–100.
All scores must be explainable.
Optimization decisions must be deterministic.
7. State Management Architecture

Zustand stores should be separated by responsibility.

Example:

stores/

imageStore.ts
    - original image
    - processed image

settingsStore.ts
    - grid options
    - color options
    - difficulty settings

worksheetStore.ts
    - generated worksheet
    - AIQES results

uiStore.ts
    - dialogs
    - loading states
    - notifications

Rules:

Avoid:

One large global store.
Storing temporary calculations.

Prefer:

Focused stores.
Clear actions.
Derived selectors.
8. Web Worker Architecture

Heavy operations must run outside the main UI thread.

Suitable tasks:

Image analysis.
Color clustering.
Large image resizing.
AIQES calculations.
PDF preparation.

Benefits:

Smooth interface.
Faster user interaction.
Better experience on old devices.
9. Performance Architecture

Target devices:

Old tablets.
Low-cost laptops.
Interactive whiteboards.

Performance goals:

Fast Mode:
< 500 ms

Balanced Mode:
< 2 seconds

Best Quality Mode:
< 5 seconds

Optimization strategies:

Avoid unnecessary canvas redraws.
Reuse image buffers.
Cache repeated calculations.
Process images incrementally.
10. Error Handling Architecture

Every processing stage must have:

Input validation.

Recovery mechanisms.

Meaningful error messages.

Example:

Avoid:

"Image processing failed."

Use:

"This image contains too many small details. Try choosing a simpler image or a larger grid size."

11. Testing Architecture

Required test levels:

Unit Tests

Test:

Color algorithms.
Grid calculations.
AIQES evaluators.
Integration Tests

Test:

Processing pipelines.
State communication.
PDF generation.
Visual Regression Tests

Ensure:

Generated worksheets remain stable between versions.
12. Security and Privacy Architecture

Current offline version:

Process images locally in the browser.
Do not upload student images.

Future cloud version:

Secure authentication.
Encrypted storage.
Privacy regulation compliance.
13. Internationalization Architecture

The system must support:

Multiple languages.
RTL languages.
Local educational standards.
Regional worksheet formats.

Use:

Translation dictionaries.
Locale-based formatting.

Avoid:

Hard-coded interface text.
14. Future System Evolution
Version 2.0

Educational Intelligence Layer.

Includes:

Child Vision Engine.
Smart Grid Selector.
AIQES.
Educational color system.
Version 3.0

Cloud platform.

Includes:

User accounts.
Cloud storage.
Worksheet libraries.
Student progress data.
Version 4.0

Global AI educational ecosystem.

Includes:

AI-generated activities.
Personalized learning.
Teacher communities.
Curriculum adaptation.
15. Architectural Decision Principles

Before adding any new feature, ask:

Does this improve educational value?
Does it maintain existing functionality?
Is it compatible with low-end devices?
Is the architecture modular?
Can the feature be tested independently?

If any answer is "No", redesign the solution.

16. Final Architecture Mission

KARESEL is not designed as a simple image conversion tool.

It is a scalable educational intelligence platform.

Every architectural decision must support:

Better learning experiences.
Faster teacher workflow.
Long-term maintainability.
Global scalability.

The ultimate architectural goal is:

Transforming image processing technology into meaningful educational experiences for millions of children.

END OF DOCUMENT