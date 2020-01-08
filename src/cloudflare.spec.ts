import anyTest, { TestInterface, serial } from 'ava'
import { load } from 'nock'
const key = 'THEN SECRET KEY OF CF ACCOUNT'
const eMail = 'john@doe.org'
const domain = 'example.com'
const host = 'dynamic'

const test = serial as TestInterface<{}>

import { Cloudflare } from './cloudflare'

test.beforeEach(async () => {
  load(__dirname + '/cf-testdata.json')
})

test('can initialize', async t => {
  const cf = new Cloudflare({ key, eMail })

  await cf.initialize(domain, [host, '@', 'test'])

  t.is(cf.zoneId, 'SYNTHETIC_ZONE_ID1')
  /*t.is(cf.dnsRecord.id, 'SYNTHETIC_DNSREC_ID0')
  t.is(cf.ip, '192.168.1.1')*/
  t.is(cf.count, 2)
})

test('failing with unknown domain', t => {
  const cf = new Cloudflare({ key, eMail })

  return cf.initialize('unknown.com', [host]).catch(e => {
    t.is(e.message, 'Zone for unknown.com not found')
  })
})

test('updating ip', async t => {
  const cf = new Cloudflare({ key, eMail })

  await cf.initialize(domain, [host])

  /*t.is(cf.zoneId, 'SYNTHETIC_ZONE_ID1')
  t.is(cf.dnsRecord.id, 'SYNTHETIC_DNSREC_ID0')*/

  t.is(await cf.setIp('192.168.1.1'), 1)
})

test('updating ip with same ip', async t => {
  const cf = new Cloudflare({ key, eMail })

  await cf.initialize(domain, [host])

  t.is(cf.zoneId, 'SYNTHETIC_ZONE_ID1')
  // t.is(cf.dnsRecord.id, 'SYNTHETIC_DNSREC_ID0')

  t.is(await cf.setIp('192.168.1.2'), 0)
})

test('updating root domain', async t => {
  const cf = new Cloudflare({ key, eMail })

  await cf.initialize(domain, ['@'])

  t.is(await cf.setIp('192.168.1.1'), 1)
})

test('updating without host', async t => {
  const cf = new Cloudflare({ key, eMail })

  await cf.initialize(domain)

  t.is(await cf.setIp('192.168.1.1'), 1)
})

test('updating multiple domains', async t => {
  const cf = new Cloudflare({ key, eMail })

  await cf.initialize(domain, ['@', 'dynamic'])

  t.is(await cf.setIp('192.168.1.1'), 2)
})
