import got from 'got'

import Debug from 'debug'

const debug = Debug('ulfalfa:dyndns-cloudflare:cloudflare')

const CF_API = 'https://api.cloudflare.com/client/v4'

export interface CloudflareOptions {
  eMail: string
  key: string
}
export class Cloudflare {
  protected _zone: any
  get zoneId(): string {
    return this._zone.id
  }

  protected _dnsRecord: any
  get dnsRecord(): any {
    return this._dnsRecord
  }

  get ip(): string {
    return this._dnsRecord.content
  }

  constructor(protected options: CloudflareOptions) {}

  protected getCf(url: string) {
    debug(`Getting ${url} from cloudflare api`)
    return got({
      method: 'GET',
      url: `${CF_API}${url}`,
      responseType: 'json',
      headers: {
        'X-Auth-Key': this.options.key,
        'X-Auth-Email': this.options.eMail,
      },
    }).then(result => (result.body as any).result)
  }

  protected async getZones(): Promise<any> {
    return this.getCf('/zones')
  }

  protected async getDnsRecords(zoneId: string): Promise<any> {
    return this.getCf(`/zones/${zoneId}/dns_records`)
  }

  protected async getDnsRecord(zoneId: string, dnsId: string): Promise<any> {
    return this.getCf(`/zones/${zoneId}/dns_records/${dnsId}`)
  }

  protected async updateIp(zoneId: string, dnsId: string, ip: string) {
    debug(`Updating zone ${zoneId} and record ${dnsId} with ${ip}`)

    const currentDns = await this.getDnsRecord(zoneId, dnsId)

    debug('Current Entry', currentDns)

    if (currentDns.content !== ip) {
      await got({
        method: 'PUT',
        url: `${CF_API}/zones/${zoneId}/dns_records/${dnsId}`,
        responseType: 'json',

        json: {
          type: currentDns.type,
          name: currentDns.name,
          ttl: currentDns.ttl,
          content: ip,
        },
        headers: {
          'X-Auth-Key': this.options.key,
          'X-Auth-Email': this.options.eMail,
        },
      }).then(result => {
        debug(result.body)
      })
    }
    this._dnsRecord = currentDns
  }

  async initialize(domain: string, host: string) {
    const name = `${host}.${domain}`

    const zone = await this.getZones().then(result =>
      result.find(aZone => aZone.name === domain)
    )

    if (!zone) {
      throw new Error(`Zone for ${domain} not found`)
    } else {
      this._zone = zone
    }

    const dnsrecord = await this.getDnsRecords(this.zoneId).then(result =>
      result.find(record => record.name === name && record.type === 'A')
    )

    if (!dnsrecord) {
      throw new Error(`DnsRecord of type A for ${name} not found`)
    } else {
      this._dnsRecord = dnsrecord
    }
  }

  async setIp(ip: string) {
    return this.updateIp(this.zoneId, this.dnsRecord.id, ip)
  }
}
