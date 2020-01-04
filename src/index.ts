import { Fritzbox } from '@ulfalfa/fritzbox'

import { Cloudflare } from './cloudflare'

import Debug from 'debug'
import { interval, from } from 'rxjs'
import {
  mergeMap,
  distinctUntilChanged,
  filter,
  switchMap,
  tap,
} from 'rxjs/operators'

const debug = Debug('ulfalfa:dyndns-cloudflare')

import yargs = require('yargs')

const argv = yargs.env('DYN').options({
  cfApikey: { type: 'string', demandOption: true, alias: 'k' },
  cfEmail: { type: 'string', demandOption: true, alias: 'e' },
  cfDomain: { type: 'string', demandOption: true, alias: 'd' },
  cfHost: { type: 'string', demandOption: false, alias: 'h' },
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
  key: argv.cfApikey as string,
})

const sub = from(cf.initialize(argv.cfDomain, argv.cfHost))
  .pipe(
    switchMap(() => interval(argv.intervall * 1000)),
    mergeMap(() => fb.getExternalIPV4()),

    filter(ip => !!ip && ip !== ''),
    distinctUntilChanged(),
    tap(ip => debug(`Current fritzip is ${ip}`)),
    mergeMap(ip => cf.setIp(ip))
  )
  .subscribe(debug(`Updated cloudflare record`))

process.on('SIGINT', () => {
  debug('Interrupted')
  sub.unsubscribe()
  process.exit(0)
})
