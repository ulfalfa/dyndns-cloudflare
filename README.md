# DynDnsUpdate

After switching from selfhost.de to cloudflare as my dns provider I had problems updating my dynamic ip of the current fritzbox vdsl line to cloudflare. I tried DNS-O-MATIC but found out, that it updated always the first A record and not the one I specified.

That's why I wrote this little package, that is getting every minute the current external ip of the fritzbox and putting it (if changed) to a A record in cloudflare.

## Installation

Just clone the repo to a local path

```
git clone https://gitlab.com/ulfalfa/dyndns-cloudflare.git
```

Then update the docker compose file with your data

```yml
version: '3.7'
services:
  dyncf:
    image: ulfalfa/dyncf
    build:
      context: .
    environment:
      - DYN_CF_DOMAIN=example.com
      - DYN_CF_HOST=dynamic
      - DYN_CF_EMAIL=YOUR_LOGIN_EMAIL_OF_CF
      - DYN_CF_APIKEY=YOUR_SECRET_CF_API_KEY

```

Finally bring up your docker container with

```sh
docker-compose up -d
```

You can also launch it directly 
```
Options:
  --help           show help                                           [boolean]
  --version        show version                                        [boolean]
  --cfApikey, -k   the api key of your cloudflare account[string] [erforderlich]
  --cfEmail, -e    the email address registered in your cloudflare account
                                                         [string] [erforderlich]
  --cfDomain, -d   an existing domain in cloudflare      [string] [erforderlich]
  --cfHost, -h     the host entries to update - you can specify multiple host by
                   comma                                                [string]
  --fritzBox, -f   the url of the fritzbox
                                   [string] [Standard: "http://fritz.box:49000"]
  --intervall, -i  how often the fritzbox ip is checked    [Zahl] [Standard: 60]

you can als use environment variables prefixed by DYN_CF_ and use snake
uppercase
```


