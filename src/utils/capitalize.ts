export function capitalize(str: string): string {
  const [firstLetter, ...rest] = str
  return firstLetter.toUpperCase() + rest.join('')
}
