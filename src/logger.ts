const IS_LOGGING_ENABLED = false

export class Logger {
  constructor(private readonly domain: string) {}

  public log(...args: Array<unknown>) {
    if (IS_LOGGING_ENABLED) {
      console.log(`[${this.domain}]`, ...args)
    }
  }

  public warn(...args: Array<unknown>) {
    if (IS_LOGGING_ENABLED) {
      console.warn(`[${this.domain}]`, ...args)
    }
  }

  public trace(...args: Array<unknown>) {
    if (IS_LOGGING_ENABLED) {
      console.trace(`[${this.domain}]`, ...args)
    }
  }

  public extend(subdomain: string | number) {
    return new Logger(`${this.domain}] [${subdomain}`)
  }
}
