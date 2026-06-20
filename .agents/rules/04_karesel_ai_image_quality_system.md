# KARESEL AI IMAGE QUALITY EVALUATION SYSTEM (AIQES)

Version: 2.0

---

# 1. Purpose

AIQES is the intelligent educational quality control engine of KARESEL.

Its purpose is not to measure how accurately a generated pixel image matches the original image.

Its purpose is to determine whether the generated activity provides an optimal learning experience for children aged 5–10.

The fundamental AIQES question is:

"Can a child recognize, complete and enjoy this activity independently?"

Every generated worksheet must pass AIQES evaluation before being recommended to the teacher.

---

# 2. Core Quality Philosophy

The best KARESEL worksheet is not the one with the highest visual similarity.

The best worksheet is the one that creates the best balance between:

* Recognition
* Simplicity
* Educational challenge
* Motivation
* Completion success

When image accuracy conflicts with educational usability, AIQES must always prioritize educational usability.

---

# 3. AIQES Score System

Every generated activity receives a score between:

0 – 100 points

Quality levels:

## 90 – 100: Excellent

* Ready for classroom use.
* No optimization required.
* Suitable for automatic recommendation.

---

## 80 – 89: Good

* Educationally valuable.
* Minor improvements may increase quality.

---

## 65 – 79: Acceptable

* Usable but requires optimization.

Recommended actions:

* Reduce color complexity.
* Adjust grid size.
* Improve object separation.

---

## Below 65: Reject

The activity should not be recommended.

The system should automatically attempt regeneration with improved settings.

---

# 4. AIQES Evaluation Components

The final score is calculated from multiple educational factors.

---

# 4.1 Object Recognizability Score (ORS)

Weight: 35%

Question:

"Can a child immediately understand what the image represents?"

Evaluation criteria:

* Main object visibility.
* Silhouette clarity.
* Foreground/background separation.
* Preservation of identifying features.

Examples:

A cat should maintain:

* Ears.
* Body shape.
* Tail.

A car should maintain:

* Wheels.
* Overall vehicle proportions.

---

# 4.2 Shape Preservation Score (SPS)

Weight: 20%

Question:

"Are the most important visual characteristics preserved?"

Evaluation:

* Contour integrity.
* Edge continuity.
* Symmetry preservation.
* Characteristic shape retention.

---

# 4.3 Educational Complexity Score (ECS)

Weight: 15%

Question:

"Is the activity appropriate for the selected age group?"

Evaluation:

* Grid dimensions.
* Total cell count.
* Detail density.
* Required attention span.
* Estimated completion time.

Penalty examples:

A 6-year-old student receiving:

* 25×25 grid.
* 20+ colors.
* Complex object details.

---

# 4.4 Color Simplicity Score (CSS)

Weight: 15%

Question:

"Can children easily distinguish the required colors?"

Evaluation:

* Number of colors.
* Color contrast.
* Color distance.
* Confusing color similarity.

Penalty examples:

* Similar shades of blue.
* Very dark neighboring colors.
* Excessive color variations.

---

# 4.5 Worksheet Effort Score (WES)

Weight: 10%

Question:

"Can the child complete this worksheet without frustration?"

Evaluation:

* Total coloring effort.
* Color switching frequency.
* Small isolated areas.
* Fine motor requirements.

---

# 4.6 Motivation Prediction Score (MPS)

Weight: 5%

Question:

"Will the child feel successful during the activity?"

Evaluation:

* Early object recognition.
* Visual satisfaction during completion.
* Balance between challenge and achievement.

---

# 5. AIQES Formula

Final AIQES score:

AIQES =
(ORS × 0.35)
+
(SPS × 0.20)
+
(ECS × 0.15)
+
(CSS × 0.15)
+
(WES × 0.10)
+
(MPS × 0.05)

Maximum possible score:

100 points.

---

# 6. Automatic Optimization Engine

If the AIQES score does not reach the required threshold, KARESEL should automatically optimize the activity.

Optimization priority:

1. Reduce unnecessary colors.
2. Increase object/background contrast.
3. Remove visual noise.
4. Simplify insignificant details.
5. Improve shape edges.
6. Adjust grid resolution.
7. Re-evaluate the result.

---

# 7. Optimization Loop

The optimization engine follows this process:

Original Image

↓

Image Processing

↓

AIQES Evaluation

↓

Score Analysis

↓

Automatic Improvements

↓

New Evaluation

↓

Best Result Selection

Maximum optimization attempts:

5 cycles.

The highest scoring result should be selected.

---

# 8. Age-Based AIQES Thresholds

## Kindergarten (Age 5–6)

Minimum required score:

90+

Requirements:

* Maximum 5 colors.
* Maximum 8×8 grid.
* Very clear shapes.

---

## Grade 1–2

Minimum required score:

85+

Requirements:

* 5–10 colors.
* Maximum 15×15 grid.
* Simple recognizable objects.

---

## Grade 3–4

Minimum required score:

80+

Requirements:

* More detail allowed.
* Maximum 25×25 grid.
* Higher complexity acceptable.

---

# 9. Automatic Image Rejection Rules

The system should immediately reject images containing:

* No obvious main object.
* Multiple overlapping subjects.
* Low foreground/background contrast.
* Excessive visual noise.
* Small unreadable details.
* Text or complex logos.

---

# 10. Teacher Quality Report

AIQES must generate a human-friendly report.

Example:

---

AIQES SCORE: 92 / 100

QUALITY LEVEL:
EXCELLENT

Recommended Level:
Grade 2

Strengths:

✓ Clear object shape.

✓ Good color separation.

✓ Appropriate difficulty.

Suggested Improvements:

None required.

---

Reports must avoid technical terminology such as:

* Edge density.
* Morphological filtering.
* Pixel variance.

Use educational language understandable by teachers.

---

# 11. Technical Architecture

Recommended source structure:

src/

engine/

quality/

AIQES.ts

ObjectRecognizabilityEvaluator.ts

ShapePreservationEvaluator.ts

EducationalComplexityEvaluator.ts

ColorSimplicityEvaluator.ts

WorksheetEffortEvaluator.ts

MotivationPredictor.ts

Engineering principles:

* Each evaluator has a single responsibility.
* Each evaluator returns a score from 0 to 100.
* Every evaluator provides improvement suggestions.
* Every evaluator must be independently testable.

---

# 12. Performance Standards

AIQES must be suitable for classroom use.

Target performance:

FAST MODE:

Less than 200 ms

BALANCED MODE:

Less than 1 second

BEST QUALITY MODE:

Less than 3 seconds

Optimization methods:

* Cached calculations.
* Incremental processing.
* Web Workers for heavy operations.

Avoid:

* Running large AI models for every image.
* Excessive memory usage.

---

# 13. Future Learning Intelligence

Future AIQES versions may learn from teacher feedback.

Examples:

Teacher feedback:

"The worksheet was too difficult."

Possible system response:

* Reduce recommended grid size.
* Reduce color count.
* Increase simplification level.

Over time, AIQES should adapt to real classroom experiences.

---

# 14. AIQES Integration With Other KARESEL Systems

AIQES works together with:

* Educational Design Standards (EDS)
* Child Vision Engine
* Smart Grid Selector
* Educational Color Intelligence
* PDF Worksheet Generator

AIQES is the final educational quality gate before worksheet generation.

---

# 15. Final AIQES Mission

AIQES does not ask:

"How many pixels match the original image?"

AIQES asks:

"Can a child understand this?"

"Can a child finish this successfully?"

"Will this activity create confidence and curiosity?"

The highest quality KARESEL worksheet is not the most realistic one.

It is the one that makes a child proudly say:

"I completed it myself."

---

END OF DOCUMENT
