# Query Sentinel AI

Query Sentinel AI is an open-source, self-hosted conversational threat-hunting assistant for SIEM environments.

Ask questions in plain language, translate them into technical queries, run them against your security data, and return:

- the generated query
- alert tables and charts
- a short investigation summary
- MITRE ATT&CK mapping
- transparent reasoning for the query choice

## Why this project exists

Many SIEM platforms now have AI features, but most are tied to a single vendor, a single workflow, or a closed interface. Query Sentinel AI is designed to be:

- transparent
- lightweight
- self-hosted
- vendor-neutral
- useful for learning and investigation

## Core idea

User question → query translation → execution → dashboard updates → explanation

Example:

**User:** Show high priority alerts from the last 24 hours

**System:**
- generates Elastic DSL, SQL, or another backend query
- runs the query
- updates tables and graphs
- explains what was searched and why
- summarizes the likely security meaning

## Planned capabilities

- Natural language to Elastic DSL / SQL / KQL
- Transparent query preview before execution
- Dynamic dashboard widgets
- Investigation summaries
- MITRE ATT&CK mapping
- Training mode for students and junior analysts
- Open-source and self-hosted deployment

## Suggested target users

- small SOC teams
- colleges and training labs
- MSMEs with limited security tooling budgets
- open-source SIEM users
- analysts learning threat hunting

## Why transparency matters

Security teams should be able to see:

- what the AI searched
- which filters were applied
- what assumptions were made
- how the answer was derived

That makes the assistant easier to trust, debug, and learn from.

## Project status

This repository is the foundation for the first working prototype.

## Next milestones

1. Backend query translator
2. Wazuh / Elastic integration
3. Query preview UI
4. Dashboard widgets
5. MITRE enrichment
6. Investigation report export

## License

MIT
