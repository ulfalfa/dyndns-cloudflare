import { Fritzbox } from '@ulfalfa/fritzbox'

import { Cloudflare } from './cloudflare'

import Debug from 'debug'
import { interval, from } from 'rxjs'
import {
  mergeMap,
  distinctUntilChanged,
  filter,
  switchMap,
} from 'rxjs/operators'

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
      if (result.NewExternalIPAddress === '') {
        return undefined
      } else {
        return result.NewExternalIPAddress
      }
    })
    .catch(e => {
      console.error(`Error getting fritzbox ip`, e)
      return undefined
    })
}

const argv = yargs.env('DYN').options({
  cfApikey: { type: 'string', demandOption: true, alias: 'k' },
  cfEmail: { type: 'string', demandOption: true, alias: 'e' },
  cfDomain: { type: 'string', demandOption: true, alias: 'd' },
  cfHost: { type: 'string', demandOption: true, alias: 'h' },
  fritzBox: {
    type: 'string',
    default: 'http://fritz.box:49000',
    alias: 'f',
    demandOption: false,
  },
  intervall: { type: 'number', demandOption: false, alias: 'i', default: 60 },
}).argv

const fb = new Fritzbox({ url: argv.fritzBox })

const cf = new Cloudflare({
  eMail: argv.cfEmail as string,
  key: argv.cfApiKey as string,
})

const observable = from(cf.initialize('krusty', 'steinberg-online'))
  .pipe(
    switchMap(() => interval(argv.intervall * 1000)),
    mergeMap(() => getIp()),
    filter(ip => !!ip),
    distinctUntilChanged(),
    mergeMap(ip => cf.setIp(ip))
  )
  .subscribe(debug, console.error)
