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

const argv = yargs
  .env('DYN')
  .options({
    cfApikey: {
      type: 'string',
      demandOption: true,
      alias: 'k',
      describe: 'the api key of your cloudflare account',
    },
    cfEmail: {
      type: 'string',
      demandOption: true,
      alias: 'e',
      describe: 'the email address registered in your cloudflare account',
    },
    cfDomain: {
      type: 'string',
      demandOption: true,
      alias: 'd',
      describe: 'an existing domain in cloudflare',
    },
    cfHost: {
      type: 'string',
      demandOption: false,
      alias: 'h',
      describe:
        'the host entries to update - you can specify multiple host by comma',
    },
    fritzBox: {
      type: 'string',
      default: 'http://fritz.box:49000',
      alias: 'f',
      demandOption: false,
      describe: 'the url of the fritzbox',
    },
    intervall: {
      type: 'number',
      demandOption: false,
      alias: 'i',
      default: 60,
      describe: 'how often the fritzbox ip is checked',
    },
  })
  .epilogue(
    'you can als use environment variables prefixed by DYN_CF_ and use snake uppercase'
  ).argv
const hosts = argv.cfHost.split(',').map(host => host.trim())
debug(`Hosts to update`, hosts)

const fb = new Fritzbox({ url: argv.fritzBox })

const cf = new Cloudflare({
  eMail: argv.cfEmail as string,
  key: argv.cfApikey as string,
})

const sub = from(cf.initialize(argv.cfDomain, hosts))
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
