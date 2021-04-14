export function isBrowser() {
  return typeof window !== 'undefined'
}

export const supports = {
  broadcastChannel() {
    return typeof BroadcastChannel !== 'undefined'
  },
}
