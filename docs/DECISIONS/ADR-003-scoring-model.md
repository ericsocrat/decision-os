# ADR-003: Weighted Sum Scoring Model

## Status

Accepted

## Context

We need a multi-criteria decision analysis (MCDA) method. Options considered:

1. **Weighted Sum Model (WSM)**: Simple, intuitive, widely understood
2. **TOPSIS**: More complex, better for conflicting criteria
3. **AHP (Analytic Hierarchy Process)**: Pairwise comparisons, more rigorous
4. **ELECTRE/PROMETHEE**: Outranking methods, complex

## Decision

**Weighted Sum Model (WSM)** with cost-inversion for cost-type criteria.

## Rationale

- **Simplicity**: Users immediately understand "weight × score"
- **Transparency**: Easy to explain why one option won
- **Determinism**: No randomness, no iteration, same input = same output
- **Extensibility**: Can layer more sophisticated methods later
- **Trade-off accepted**: WSM assumes criteria are independent (no interaction effects)

## Consequences

- Scoring is linear only (no diminishing returns)
- All criteria assumed independent
- Document the model clearly so users understand limitations
- Cost criteria handled via score inversion (10 - score)
