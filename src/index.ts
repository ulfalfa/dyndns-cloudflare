import { Fritzbox } from '@ulfalfa/fritzbox'

import * as Cloudflare from 'cloudflare'

import Debug from 'debug'
import { interval } from 'rxjs'
import { mergeMap, distinctUntilChanged } from 'rxjs/operators'

const debug = Debug('ulfalfa:dyndns-cloudflare')

import yargs = require('yargs')

async function getIp(): Promise<string> {
  // for ip 6
  // .exec(
  //   'urn:schemas-upnp-org:service:WANIPConnection:1',
  //  'X_AVM_DE_GetExternalIPv6Address'
  // )

  return fb
    .exec(
      'urn:schemas-upnp-org:service:WANIPConnection:1',
      'GetExternalIPAddress'
    )
    .then((result: any) => {
      debug(`IP read ${result.NewExternalIPAddress}`)
      return result.NewExternalIPAddress
    })
}

async function updateCloudFlare(host: string, domain: string, ip: string) {
  const name = `${host}.${domain}`
  debug(`updating A record of ${name} with ${ip}`)

  // first getting info
  const zone = await cf.zones
    .browse()
    .then(result => result.result.find(zone => zone.name === domain))

  if (!zone) {
    throw new Error(`Zone for ${domain} not found `)
  }

  const dnsrecord = await cf.dnsRecords
    .browse(zone.id)
    .then(result =>
      result.result.find(record => record.name === name && record.type === 'A')
    )

  if (!dnsrecord) {
    throw new Error(`DnsRecord of type A for ${name} not found `)
  }

  if (dnsrecord.content !== ip) {
    debug(`Updating zone ${zone.id} and record ${dnsrecord.id} with ${ip}`)
    return await cf.dnsRecords
      .edit(zone.id, dnsrecord.id, {
        type: 'A',
        name,
        ttl: 1,
        content: ip,
      })
      .then(result => result.result)
  } else {
    debug('IP already there')
    return dnsrecord
  }
}

const argv = yargs.options({
  cfApiKey: { type: 'string', demandOption: true, alias: 'k' },
  cfEmail: { type: 'string', demandOption: true, alias: 'e' },
  cfDomain: { type: 'string', demandOption: true, alias: 'd' },
  cfHost: { type: 'string', demandOption: true, alias: 'h' },
  fritz: {
    type: 'string',
    default: 'http://fritz.box:49000',
    alias: 'f',
    demandOption: false,
  },
  intervall: { type: 'number', demandOption: false, alias: 'i', default: 60 },
}).argv

const fb = new Fritzbox({ url: argv.fritz })

const cf = new Cloudflare({
  email: argv.cfEmail,
  key: argv.cfApiKey,
})

const observable = interval(argv.intervall * 1000)
  .pipe(
    mergeMap(() => getIp()),
    distinctUntilChanged(),
    mergeMap(ip => updateCloudFlare('krusty', 'steinberg-online.de', ip))
  )
  .subscribe(debug, console.error)
