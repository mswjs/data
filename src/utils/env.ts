export function isBrowser() {
  return typeof window !== 'undefined'
}

export const supports = {
  sessionStorage() {
    return typeof sessionStorage !== 'undefined'
  },
  broadcastChannel() {
    return typeof BroadcastChannel !== 'undefined'
  },
}
