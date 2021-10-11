import { DeepRequiredExactlyOne } from '../../src/glossary'

type Shallow = DeepRequiredExactlyOne<{ a: number; b: string }>

let shallow: Shallow = { a: 1 }
shallow = { b: '' }

// @ts-expect-error Only one known property is allowed.
shallow = { a: 1, b: '' }

type Nested = DeepRequiredExactlyOne<{ a: number; b: { c: { d: string } } }>

let nested: Nested = { a: 1 }
nested = { b: { c: { d: '' } } }

// @ts-expect-error Only one known property is allowed.
nested = { a: 1, b: { c: { d: '' } } }
