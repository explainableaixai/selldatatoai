# selldatatoai

Official clients and examples for the Data Asset Score API, the scoring service behind the [Sell Data to AI website](https://www.selldatatoai.com/).

The API answers one question about any company domain: how much of the data AI buyers want does this company likely hold? The answer is a score from 0 to 100, a grade from A to E, the company status, the systems of record it runs, the data types it likely holds and its web history. It is computed against an index of 102 million domains, 99.99% of the active internet, with history for each domain.

This repository holds the Node.js and Python clients. Clients for six more languages live in their own repositories, listed below.

## Clients

| Language | Install | Source |
|---|---|---|
| Node.js | `npm install selldatatoai` | [node/](node/) in this repository |
| Python | `pip install selldatatoai` | [python/](python/) in this repository, and https://github.com/explainableaixai/selldatatoai-python |
| Go | `go get github.com/explainableaixai/selldatatoai-go` | https://github.com/explainableaixai/selldatatoai-go |
| Rust | `cargo add selldatatoai` | https://github.com/explainableaixai/selldatatoai-rust |
| .NET | `dotnet add package AlphaQuantum.SellDataToAI` | https://github.com/explainableaixai/selldatatoai-dotnet |
| Elixir | `{:selldatatoai, "~> 1.0"}` | https://github.com/explainableaixai/selldatatoai-elixir |
| Dart | `dart pub add selldatatoai` | https://github.com/explainableaixai/selldatatoai-dart |
| PHP | Composer, VCS repository | https://github.com/explainableaixai/selldatatoai-php |

Every client covers the same six operations: score one domain, submit a batch, poll a batch, wait for a batch, score any number of domains, and read usage. They share names where the language allows it, so moving between them is easy.

## The API in one page

Base URL: `https://www.selldatatoai.com/api/v1/`

Authentication: an `X-API-Key` header on every request. Keys are issued in your dashboard as soon as a plan is active.

| Method | Path | What it does | Lookups |
|---|---|---|---|
| GET | `/score?domain={domain}` | Score one company | 1 |
| POST | `/score/batch` | Submit up to 100 domains | 1 per valid, unique domain |
| GET | `/score/batch?id={id}` | Poll a batch | 0 |
| GET | `/usage` | Plan, lookups used and remaining | 0 |

The full field reference lives in the [Data Asset Score API docs](https://www.selldatatoai.com/api/).

### With curl

```bash
curl -H "X-API-Key: $SDA_API_KEY" \
  "https://www.selldatatoai.com/api/v1/score?domain=example.com"
```

```bash
curl -X POST -H "X-API-Key: $SDA_API_KEY" -H "Content-Type: application/json" \
  -d '{"domains": ["example-one.com", "example-two.com"]}' \
  "https://www.selldatatoai.com/api/v1/score/batch"
```

```bash
curl -H "X-API-Key: $SDA_API_KEY" "https://www.selldatatoai.com/api/v1/usage"
```

### With Node.js

```js
const { DataAssetScoreClient } = require('selldatatoai');
const client = new DataAssetScoreClient(process.env.SDA_API_KEY);

const s = await client.score('example.com');
console.log(s.data_asset_score, s.grade, s.status);
```

### With Python

```python
import os
from selldatatoai import DataAssetScoreClient

client = DataAssetScoreClient(os.environ["SDA_API_KEY"])
items = client.score_many(open("domains.txt").read().split())
best = sorted((i["result"] for i in items if i["status"] == "done"),
              key=lambda r: r["data_asset_score"], reverse=True)[:20]
```

## Field glossary

| Field | Meaning |
|---|---|
| `data_asset_score` | 0 to 100. How much valuable, sellable data the company likely holds. |
| `grade` | A to E, from the score. |
| `status` | `active`, `winding_down_or_acquired`, `parked`, `unreachable` or `error`. |
| `verified_active` | The domain resolves, is not expired, and the site is not a parking or error page. |
| `iab_category` | IAB content category of the website (taxonomy v3). |
| `country` | Country of the company in the index. |
| `history.first_seen_year` | First year the domain was seen. |
| `history.years_online` | Years online. |
| `history.founded_year` | Founding year when the site states it. |
| `history.pre_ai_years` | Years online before 2023. |
| `pre_ai_archive_likely` | 10 or more years online before 2023. |
| `data_systems` | Systems of record the company runs, each with the record type it holds. |
| `likely_data_assets` | Record types the company likely holds. |
| `strengths` | Up to three factor groups where the company is strongest. |
| `data_coverage` | `full`, `partial` or `limited`: how complete the signals were. |
| `in_index` | The domain is in the 102M index. |
| `checked_at`, `cached` | When the result was taken; whether it was reused from the last 30 days. |

## Errors

| HTTP | `error` | Meaning |
|---|---|---|
| 400 | `invalid_domain` | The domain is not valid. |
| 400 | `no_domains`, `too_many_domains` | A batch needs 1 to 100 domains. |
| 401 | `missing_api_key`, `invalid_api_key` | No key, or the key is not active. |
| 404 | `batch_not_found` | Unknown batch for this key, or older than 7 days. |
| 410 | `not_available` | The API scores domains only; lists are sold as files. |
| 429 | `monthly_limit_reached` | This month's lookups are used. Reset on the 1st, UTC. |
| 429 | `batch_busy` | Three of your batches are still running. |

Every client turns these into its language's usual error type, with the HTTP status and the `error` string kept.

## Batch rules

1. Up to 100 domains per call, as a JSON array, a form field or one domain per line.
2. One lookup per valid, unique domain, charged at submit. Duplicates and invalid rows are free.
3. Domains scored in the last 30 days come back at once.
4. The rest are scored in the background, usually within a minute.
5. Polling is free. Results keep input order and are kept for 7 days.
6. Up to three open batches per key.

## Who this is for

An [AI data broker](https://www.selldatatoai.com/what-is-an-ai-data-broker/) finds companies with useful records, arranges the licence and takes a fee. A data company does the same at scale. Both spend most of their time on sourcing, and most candidate companies turn out to be a poor fit.

The score moves that filtering to the start. A researcher can sort a thousand domains in minutes and spend the day on the top fifty.

Three groups use it most:

- **Brokers and data companies** ranking seller candidates before outreach.
- **Referral partners** screening companies before they introduce them to a program. The page [buyer programs compared](https://www.selldatatoai.com/buyer-programs-compared/) sets each program's published rules side by side.
- **Company owners** who want an outside view before they talk to anyone.

## A typical workflow

1. Export candidate domains from your CRM, a sector list or an event attendee list.
2. Run them through `scoreMany` or `score_many`.
3. Drop rows where `verified_active` is false.
4. Set aside `winding_down_or_acquired` rows for a separate conversation.
5. Sort the rest by grade, then by score.
6. Group the top rows by `data_systems` type, since buyers ask by record type.
7. Contact the top of each group with a pitch about the records they hold.

Step 6 matters because buyers rarely want "company data". They want engineering tickets, support conversations, call recordings or design files. For engineering records, there is a ready file of [companies with work tickets and wikis](https://www.selldatatoai.com/lists/data-type/work-tickets-and-wikis/).

## Value tiers

Not every deal is a file transfer. The same records can be sold as raw exports, as graded evaluations, or as a simulated workplace an AI agent trains in. The explainer [raw data vs evaluations vs RL environments](https://www.selldatatoai.com/raw-data-vs-evaluations-vs-environments/) sets out what each tier is worth and how much work it takes.

Whichever tier a seller picks, the work before an offer is the same. The checklist on how to [prepare your data for sale](https://www.selldatatoai.com/prepare-your-data-for-sale/) lists six steps, in order.

## Lists

The API scores the domains you send and never returns lists. Lists are sold separately as one-time files: the top 3,000 US companies of a sector by score, from $249 a list, with download links sent by email. One example is the [marketing agencies list](https://www.selldatatoai.com/lists/marketing-agencies/). Lists by data type are sold next to the sector lists.

## Plans

| Plan | Price | Lookups a month | Batch |
|---|---|---|---|
| Basic | $99 a month | 5,000 | |
| Pro | $299 a month | 25,000 | yes |
| Scale | $799 a month | 100,000 | yes |

There is no free plan and no trial. The demo on the website allows 5 checks a day. Limits reset on the first day of each month, UTC.

## FAQ

### What is the Data Asset Score API?

The Data Asset Score API, from selldatatoai.com, scores any company domain from 0 to 100 for the data AI buyers want. It returns a grade, status, systems of record, likely data assets and web history, from an index of 102 million domains.

### Which client should I use?

The one for the language your job already runs in. All eight clients cover the same endpoints, and the plain HTTP API is easy to call from anything else.

### Is a cached result cheaper?

No. Each scored domain counts as one lookup. Results are reused for 30 days, and `cached` tells you when that happened.

### Can I use the API from a browser or a mobile app?

Call it from your server. A key shipped in front-end code can be copied, and every lookup on it is billed to your plan.

### Is the score a valuation?

No. It is an estimate from public signals that tells you which companies to look at first. Only a buyer can price data, after it sees a manifest and samples.

### Are the weights published?

No. The website explains what each factor group looks at, while the weights themselves stay private.

## Repository layout

```
node/     Node.js client (npm: selldatatoai), zero dependencies, TypeScript types
python/   Python client (PyPI: selldatatoai), requests only, CLI included
```

Run the tests offline:

```bash
cd node && node test.js
cd python && python -m unittest tests.test_client
```

## Links

- Website: https://www.selldatatoai.com/
- Node.js: [nodejs.org](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)
- Python: [python.org](https://www.python.org/about/gettingstarted/)

## License

MIT. Copyright (c) 2026 Alpha Quantum. Contact: info@alpha-quantum.com
