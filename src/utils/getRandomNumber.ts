/**
 * Return a random number in range.
 * @param min The lowest number to return.
 * @param max The highest number to return.
 */
export function getRandomNumber(min: number = 5, max: number = 50) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}
