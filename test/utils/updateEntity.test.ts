import { primaryKey, oneOf, manyOf, nullable } from '../../src'
import { updateEntity } from '../../src/model/updateEntity'
import { testFactory } from '../../test/testUtils'

describe('plain value', () => {
  it('updates a single root-level property', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        firstName: String,
      },
    })

    const user = db.user.create({
      id: 'user-1',
      firstName: 'John',
    })
    const nextUser = updateEntity(user, { firstName: 'Jack' }, dictionary.user)

    expect(nextUser).toEqual(
      entity('user', {
        id: 'user-1',
        firstName: 'Jack',
      }),
    )
  })

  it('updates multiple root-level properties', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        firstName: String,
        lastName: String,
      },
    })

    const user = db.user.create({
      id: 'user-1',
      firstName: 'John',
      lastName: 'Maverick',
    })
    const nextUser = updateEntity(
      user,
      {
        firstName: 'Kate',
        lastName: 'Brook',
      },
      dictionary.user,
    )

    expect(nextUser).toEqual(
      entity('user', {
        id: 'user-1',
        firstName: 'Kate',
        lastName: 'Brook',
      }),
    )
  })

  it('updates a nested property', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        address: {
          billing: {
            street: String,
          },
        },
      },
    })

    const user = db.user.create({
      id: 'user-1',
      address: {
        billing: {
          street: 'Baker st.',
        },
      },
    })
    const nextUser = updateEntity(
      user,
      {
        address: {
          billing: {
            street: 'Sunwell ave.',
          },
        },
      },
      dictionary.user,
    )

    expect(nextUser).toEqual(
      entity('user', {
        id: 'user-1',
        address: {
          billing: {
            street: 'Sunwell ave.',
          },
        },
      }),
    )
  })

  it('updates multiple nested properties', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        address: {
          billing: {
            street: String,
          },
          delivery: {
            street: String,
          },
        },
      },
    })

    const user = db.user.create({
      id: 'user-1',
      address: {
        billing: { street: 'Baker st.' },
        delivery: { street: 'Brightingale' },
      },
    })
    const nextUser = updateEntity(
      user,
      {
        address: {
          billing: { street: 'Sunwell ave.' },
          delivery: { street: 'Theodor' },
        },
      },
      dictionary.user,
    )

    expect(nextUser).toEqual(
      entity('user', {
        id: 'user-1',
        address: {
          billing: { street: 'Sunwell ave.' },
          delivery: { street: 'Theodor' },
        },
      }),
    )
  })

  it('skips unknown model properties', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        firstName: String,
      },
    })

    const user = db.user.create({
      id: 'user-1',
      firstName: 'John',
    })
    const nextUser = updateEntity(
      user,
      {
        location: 'Madrid',
      },
      dictionary.user,
    )

    expect(nextUser).toEqual(
      entity('user', {
        id: 'user-1',
        firstName: 'John',
      }),
    )
  })
})

describe('evolver function', () => {
  it('updates a single root-level property', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        firstName: String,
        age: Number,
      },
    })

    const user = db.user.create({
      id: 'user-1',
      firstName: 'John',
      age: 24,
    })

    const firstNameEvolver = vi.fn(() => 'Jack')
    const nextUser = updateEntity(
      user,
      {
        firstName: firstNameEvolver,
      },
      dictionary.user,
    )

    expect(firstNameEvolver).toHaveBeenCalledWith('John', user)
    expect(nextUser).toEqual(
      entity('user', {
        id: 'user-1',
        firstName: 'Jack',
        age: 24,
      }),
    )
  })

  it('updates a multiple root-level properties', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        firstName: String,
        age: Number,
      },
    })

    const user = db.user.create({
      id: 'user-1',
      firstName: 'John',
      age: 24,
    })

    const firstNameEvolver = vi.fn(() => 'Jack')
    const ageEvolver = vi.fn(() => 31)
    const nextUser = updateEntity(
      user,
      {
        firstName: firstNameEvolver,
        age: ageEvolver,
      },
      dictionary.user,
    )

    expect(firstNameEvolver).toHaveBeenCalledWith('John', user)
    expect(ageEvolver).toHaveBeenCalledWith(24, user)
    expect(nextUser).toEqual(
      entity('user', {
        id: 'user-1',
        firstName: 'Jack',
        age: 31,
      }),
    )
  })

  it('updates a nested property', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        address: {
          billing: {
            street: String,
          },
        },
      },
    })

    const user = db.user.create({
      id: 'user-1',
      address: {
        billing: { street: 'Baker st.' },
      },
    })

    const streetEvolver = vi.fn(() => 'Sunwell ave.')
    const nextUser = updateEntity(
      user,
      {
        address: {
          billing: { street: streetEvolver },
        },
      },
      dictionary.user,
    )

    expect(streetEvolver).toHaveBeenCalledWith('Baker st.', user)
    expect(nextUser).toEqual(
      entity('user', {
        id: 'user-1',
        address: {
          billing: { street: 'Sunwell ave.' },
        },
      }),
    )
  })

  it('updates mutliple nested properties', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        address: {
          billing: {
            street: String,
          },
          delivery: {
            street: String,
          },
        },
      },
    })

    const user = db.user.create({
      id: 'user-1',
      address: {
        billing: { street: 'Baker st.' },
        delivery: { street: 'Brightingale' },
      },
    })

    const billingStreetEvolver = vi.fn(() => 'Sunwell ave.')
    const deliveryStreetEvolver = vi.fn(() => 'Theodor')
    const nextUser = updateEntity(
      user,
      {
        address: {
          billing: { street: billingStreetEvolver },
          delivery: { street: deliveryStreetEvolver },
        },
      },
      dictionary.user,
    )

    expect(billingStreetEvolver).toHaveBeenCalledWith('Baker st.', user)
    expect(deliveryStreetEvolver).toHaveBeenCalledWith('Brightingale', user)
    expect(nextUser).toEqual(
      entity('user', {
        id: 'user-1',
        address: {
          billing: { street: 'Sunwell ave.' },
          delivery: { street: 'Theodor' },
        },
      }),
    )
  })
})

describe('relationship', () => {
  it('updates a single root-level "ONE_OF" relationship', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        country: oneOf('country'),
      },
      country: {
        code: primaryKey(String),
      },
    })

    const user = db.user.create({
      id: 'user-1',
      country: db.country.create({ code: 'uk' }),
    })
    const nextUser = updateEntity(
      user,
      {
        country: db.country.create({ code: 'us' }),
      },
      dictionary.user,
    )

    expect(nextUser).toHaveRelationalProperty(
      'country',
      entity('country', {
        code: 'us',
      }),
    )
  })

  it('updates multiple root-level "ONE_OF" relationships', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        role: oneOf('role'),
        country: oneOf('country'),
      },
      role: {
        name: primaryKey(String),
      },
      country: {
        code: primaryKey(String),
      },
    })

    const user = db.user.create({
      id: 'user-1',
      role: db.role.create({ name: 'reader' }),
      country: db.country.create({ code: 'uk' }),
    })
    const nextUser = updateEntity(
      user,
      {
        role: db.role.create({ name: 'moderator' }),
        country: db.country.create({ code: 'us' }),
      },
      dictionary.user,
    )

    expect(nextUser).toHaveRelationalProperty(
      'role',
      entity('role', { name: 'moderator' }),
    )
    expect(nextUser).toHaveRelationalProperty(
      'country',
      entity('country', { code: 'us' }),
    )
  })

  it('updates a nested "ONE_OF" relationship', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        address: {
          country: oneOf('country'),
        },
      },
      country: {
        code: primaryKey(String),
      },
    })

    const user = db.user.create({
      id: 'user-1',
      address: {
        country: db.country.create({ code: 'uk' }),
      },
    })
    const nextUser = updateEntity(
      user,
      {
        address: {
          country: db.country.create({ code: 'us' }),
        },
      },
      dictionary.user,
    )

    expect(nextUser).toEqual(
      entity('user', {
        id: 'user-1',
        address: {
          country: entity('country', { code: 'us' }),
        },
      }),
    )
    expect(nextUser.address).toHaveRelationalProperty(
      'country',
      entity('country', { code: 'us' }),
    )
  })

  it('updates a root-level "MANY_OF" relationship', () => {
    const { db, dictionary, entity } = testFactory({
      user: {
        id: primaryKey(String),
        posts: manyOf('post'),
      },
      post: {
        title: primaryKey(String),
      },
    })

    const user = db.user.create({
      id: 'user-1',
      posts: [
        db.post.create({ title: 'First post' }),
        db.post.create({ title: 'Second post' }),
      ],
    })

    const nextUser = updateEntity(
      user,
      {
        posts: [db.post.create({ title: 'Third post' })],
      },
      dictionary.user,
    )

    expect(nextUser).toHaveRelationalProperty('posts', [
      entity('post', { title: 'Third post' }),
    ])
  })

  it('updates a nullable "MANY_OF" relationship to null', () => {
    const { db, dictionary } = testFactory({
      user: {
        id: primaryKey(String),
        posts: nullable(manyOf('post')),
      },
      post: {
        title: primaryKey(String),
      },
    })

    const user = db.user.create({
      id: 'user-1',
      posts: [
        db.post.create({ title: 'First post' }),
        db.post.create({ title: 'Second post' }),
      ],
    })

    const nextUser = updateEntity(
      user,
      {
        posts: null,
      },
      dictionary.user,
    )

    expect(nextUser).toHaveRelationalProperty('posts', null)
  })

  it('forbids updating a "MANY_OF" relationship to a non-array value', () => {
    const { db, dictionary } = testFactory({
      user: {
        id: primaryKey(String),
        posts: manyOf('post'),
      },
      post: {
        title: primaryKey(String),
      },
    })

    const user = db.user.create({
      id: 'user-1',
      posts: [
        db.post.create({ title: 'First post' }),
        db.post.create({ title: 'Second post' }),
      ],
    })

    expect(() =>
      updateEntity(
        user,
        {
          /**
           * @note The next value of the "MANY_OF" relationship
           * must be an array.
           */
          posts: db.post.create({ title: 'Third post' }),
        },
        dictionary.user,
      ),
    ).toThrow(
      'Failed to update a "MANY_OF" relationship to "post" at "user.posts" (id: "user-1"): expected the next value to be an array of entities but got {"title":"Third post"}.',
    )
  })

  it('forbids updating a "MANY_OF" relationship when any member references a different model', () => {
    const { db, dictionary } = testFactory({
      user: {
        id: primaryKey(String),
        posts: manyOf('post'),
      },
      post: {
        title: primaryKey(String),
      },
      country: {
        code: primaryKey(String),
      },
    })

    const user = db.user.create({
      id: 'user-1',
      posts: [
        db.post.create({ title: 'First post' }),
        db.post.create({ title: 'Second post' }),
      ],
    })

    expect(() =>
      updateEntity(
        user,
        {
          posts: [
            db.post.create({ title: 'Third post' }),
            db.country.create({ code: 'uk' }),
          ],
        },
        dictionary.user,
      ),
    ).toThrow(
      'Failed to update a "MANY_OF" relationship to "post" at "user.posts" (id: "user-1"): expected the next value at index 1 to reference a "post" but got "country".',
    )
  })

  it('forbids updating a non-nullable "MANY_OF" relationship to null', () => {
    const { db, dictionary } = testFactory({
      user: {
        id: primaryKey(String),
        posts: manyOf('post'),
      },
      post: {
        title: primaryKey(String),
      },
    })

    const user = db.user.create({
      id: 'user-1',
      posts: [
        db.post.create({ title: 'First post' }),
        db.post.create({ title: 'Second post' }),
      ],
    })

    expect(() =>
      updateEntity(
        user,
        {
          posts: null,
        },
        dictionary.user,
      ),
    ).toThrow(
      'Failed to update a "MANY_OF" relationship to "post" at "user.posts" (id: "user-1"): cannot update a non-nullable relationship to null.',
    )
  })

  it('preserves nested relational properties after updating the parent entity', () => {
    const { db, dictionary } = testFactory({
      user: {
        id: primaryKey(String),
        firstName: String,
        address: {
          billing: {
            country: oneOf('country') as any,
          },
        },
      },
      country: {
        code: primaryKey(String),
      },
    })

    const country = db.country.create({ code: 'uk' })
    const user = db.user.create({
      id: 'user-1',
      firstName: 'John',
      address: {
        billing: {
          country,
        },
      },
    })

    const nextUser = updateEntity(
      user,
      {
        firstName: 'Wade',
      },
      dictionary.user,
    )

    expect(nextUser.address.billing).toHaveRelationalProperty(
      'country',
      country,
    )
    expect(nextUser.address.billing.country.code).toEqual('uk')
  })
})
