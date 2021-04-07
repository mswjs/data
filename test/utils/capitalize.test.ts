import { capitalize } from '../../src/utils/capitalize'

it('capitalizes a given string', () => {
  expect(capitalize('user')).toEqual('User')
  expect(capitalize('deliveryType')).toEqual('DeliveryType')
  expect(capitalize('AlreadyCapitalized')).toEqual('AlreadyCapitalized')
})
