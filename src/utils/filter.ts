export function filter<S, T extends S[]>(
  records: T,
  predicate: (value: S) => boolean,
  limit?: number,
) {
  const filteredRecords = []

  for (let i = 0; i < records.length; i++) {
    if (limit && filteredRecords.length === limit) break
    if (predicate(records[i])) {
      filteredRecords.push(records[i])
    }
  }
  return filteredRecords
}
