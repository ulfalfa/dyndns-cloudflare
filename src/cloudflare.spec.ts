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

  await cf.initialize(domain, host)

  t.is(cf.zoneId, 'SYNTHETIC_ZONE_ID1')
  t.is(cf.dnsRecord.id, 'SYNTHETIC_DNSREC_ID0')
  t.is(cf.ip, '192.168.1.1')
})

test('failing with unknown domain', t => {
  const cf = new Cloudflare({ key, eMail })

  return cf.initialize('unknown.com', host).catch(e => {
    t.is(e.message, 'Zone for unknown.com not found')
  })
})

test('failing with unknown host', t => {
  const cf = new Cloudflare({ key, eMail })

  return cf.initialize(domain, 'unknown').catch(e => {
    t.is(e.message, 'DnsRecord of type A for unknown.example.com not found')
  })
})

test('updating ip', async t => {
  const cf = new Cloudflare({ key, eMail })

  await cf.initialize(domain, host)

  t.is(cf.zoneId, 'SYNTHETIC_ZONE_ID1')
  t.is(cf.dnsRecord.id, 'SYNTHETIC_DNSREC_ID0')

  await cf.setIp('192.168.1.1')
  t.pass()
})

test('updating ip with same ip', async t => {
  const cf = new Cloudflare({ key, eMail })

  await cf.initialize(domain, host)

  t.is(cf.zoneId, 'SYNTHETIC_ZONE_ID1')
  t.is(cf.dnsRecord.id, 'SYNTHETIC_DNSREC_ID0')

  await cf.setIp('192.168.1.2')
  t.pass()
})
