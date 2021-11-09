import { definePropertyAtPath } from '../../src/utils/definePropertyAtPath'

type AnyObject = Record<string, any>

describe('definePropertyAtPath()', () => {
  it('defines a root property by give name', () => {
    const target: AnyObject = {}
    definePropertyAtPath(target, ['a'], {
      get() {
        return 'hello world'
      },
    })
    expect(target.a).toEqual('hello world')
  })

  it('defines a nested property at a given path', () => {
    const target: AnyObject = {}
    definePropertyAtPath(target, ['a', 'b', 'c'], {
      get() {
        return 'hello world'
      },
    })
    expect(target.a.b.c).toEqual('hello world')
  })

  it('defines properies with dots in them', () => {
    const target: AnyObject = {}
    definePropertyAtPath(target, ['a.b.c'], {
      get() {
        return 'hello world'
      },
    })
    expect(target['a.b.c']).toEqual('hello world')
  })

  it('defines deep properies with dots in them', () => {
    const target: AnyObject = {}
    definePropertyAtPath(target, ['a.b.c', 'e.d.f'], {
      get() {
        return 'hello world'
      },
    })
    expect(target['a.b.c']['e.d.f']).toEqual('hello world')
  })
})
