import { performance, PerformanceObserver, PerformanceEntry } from 'perf_hooks'

export function repeat(action: () => void, times: number) {
  for (let i = 0; i < times; i++) {
    action()
  }
}

export async function measurePerformance(
  name: string,
  fn: () => void | Promise<void>,
): Promise<PerformanceEntry> {
  const startEvent = `${name}Start`
  const endEvent = `${name}End`

  return new Promise(async (resolve) => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntriesByName(name)
      const lastEntry = entries[entries.length - 1]

      observer.disconnect()
      resolve(lastEntry)
    })
    observer.observe({ entryTypes: ['measure'], buffered: false })

    performance.mark(startEvent)
    await fn()
    performance.mark(endEvent)
    performance.measure(name, startEvent, endEvent)
  })
}
