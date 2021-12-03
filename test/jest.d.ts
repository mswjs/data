import type { Value } from 'lib/glossary'

type OwnMatcherFn<
  Target extends unknown,
  Matcher extends (...args: any[]) => void,
> = (...args: Parameters<Matcher>) => void

export interface OwnMatchers extends Record<string, OwnMatcherFn<any, any>> {
  toHaveRelationalProperty: OwnMatcherFn<
    Value<any, any>,
    (propertyName: string, value?: Value<any, any> | null) => void
  >
}

type CustomExtendMap = {
  [MatcherName in keyof OwnMatchers]: OwnMatchers[MatcherName] extends OwnMatcherFn<
    infer TargetType,
    any
  >
    ? (
        this: jest.MatcherContext,
        received: TargetType,
        ...actual: Parameters<OwnMatchers[MatcherName]>
      ) => ReturnType<jest.CustomMatcher>
    : never
}

declare global {
  namespace jest {
    interface Matchers<R> extends OwnMatchers {}
    interface ExpectExtendMap extends CustomExtendMap {}
  }
}
