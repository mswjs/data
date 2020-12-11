export function numberInRange(
  min: number,
  max: number,
  actual: number,
): boolean {
  return actual >= min && actual <= max
}
