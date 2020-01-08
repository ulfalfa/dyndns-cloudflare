import got from 'got'

import Debug from 'debug'

const debug = Debug('ulfalfa:dyndns-cloudflare:cloudflare')

const CF_API = 'https://api.cloudflare.com/client/v4'
const EMPTY_DOMAIN = '@'

interface CfDnsRecord {
  id: string
  type: string
  name: string
  content: string
  ttl: string
}
export interface CloudflareOptions {
  eMail: string
  key: string
}
export class Cloudflare {
  protected _zone: any
  get zoneId(): string {
    return this._zone.id
  }
  get domain(): string {
    return this._zone.name
  }

  protected dnsRecords: CfDnsRecord[]

  protected dnsRecordMap: Map<string, CfDnsRecord> = new Map()

  get count(): number {
    return this.dnsRecordMap.size
  }

  constructor(protected options: CloudflareOptions) {}

  protected cfGet(url: string) {
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

  protected async cfGetZones(): Promise<any> {
    return this.cfGet('/zones')
  }

  protected async cfGetDnsRecords(zoneId: string): Promise<any> {
    return this.cfGet(`/zones/${zoneId}/dns_records`)
  }

  protected async cfGetDnsRecord(
    zoneId: string,
    dnsId: string
  ): Promise<CfDnsRecord> {
    return this.cfGet(`/zones/${zoneId}/dns_records/${dnsId}`)
  }

  protected async cfPutDnsRecordIp(dnsId: string, ip: string) {
    debug(`Updating zone ${this.zoneId} and record ${dnsId} with ${ip}`)

    const currentDns = await this.cfGetDnsRecord(this.zoneId, dnsId)

    debug(`Current ip for ${currentDns.name} is ${currentDns.content}`)

    if (currentDns.content !== ip) {
      return await got<CfDnsRecord>({
        method: 'PUT',
        url: `${CF_API}/zones/${this.zoneId}/dns_records/${dnsId}`,
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
        debug(`Update for ${currentDns.name} successful`)
        return true
      })
    } else {
      debug(`IP for {currentDns.name} is already up-to-date`)
      return false
    }
  }

  protected async updateDnsRecordMap(hosts: string[]) {
    const dnsRecords = await this.cfGetDnsRecords(this.zoneId)
    /*.then(result =>
      result.find(record => record.name === name && record.type === 'A')
    )*/

    /*if (!dnsrecord) {
      throw new Error(`DnsRecord of type A for ${name} not found`)
    }*/
    hosts.forEach(host => {
      const name =
        host !== EMPTY_DOMAIN ? `${host}.${this.domain}` : this.domain
      const dnsRecord: CfDnsRecord = dnsRecords.find(
        (record: CfDnsRecord) => record.name === name && record.type === 'A'
      )

      if (dnsRecord) {
        this.dnsRecordMap.set(dnsRecord.id, dnsRecord)
      } else {
        debug(`WARNING: ${name} not known - skipping`)
      }
    })

    debug(`DNS Records found`, this.dnsRecordMap.keys())
  }

  async initialize(domain: string, hosts: string[] = [EMPTY_DOMAIN]) {
    debug(`Initialize for ${domain} and ${hosts}`)
    const zone = await this.cfGetZones().then(result =>
      result.find(aZone => aZone.name === domain)
    )

    if (!zone) {
      throw new Error(`Zone for ${domain} not found`)
    } else {
      debug(`Zone found`, zone.id)
      this._zone = zone
    }

    await this.updateDnsRecordMap(hosts)
  }

  async setIp(ip: string): Promise<number> {
    const recordId: string = this.dnsRecordMap.keys().next().value

    let count = 0
    for (const [id, _] of this.dnsRecordMap) {
      count += (await this.cfPutDnsRecordIp(id, ip)) ? 1 : 0
    }
    return count
  }
}
