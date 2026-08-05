# AGENT.md

# Query Sentinel AI

## Project Vision

Query Sentinel AI is an open-source, self-hosted conversational AI assistant for Security Operations Centers (SOCs).

The goal is to enable analysts to ask questions in natural language while maintaining complete transparency of every AI action.

Unlike vendor-specific AI assistants, Query Sentinel AI focuses on:

- Explainability
- Vendor neutrality
- Self-hosting
- Education
- Low-cost SOC environments
- Open-source collaboration

The project is **not** intended to compete directly with Microsoft Sentinel Copilot or Splunk AI.

Instead, it provides an explainable investigation layer that works across SIEM platforms.

---

# Primary Objectives

Natural Language

↓

Elastic DSL / SQL / KQL Translation

↓

Show Generated Query

↓

Execute Query

↓

Update Dashboard

↓

Generate Investigation Summary

↓

Recommend Next Investigation Steps

---

# Current Architecture

Frontend

React + Vite

Backend

FastAPI

LLM Provider

Primary:
- Ollama

Optional:
- Hugging Face

Future:
- llama.cpp
- OpenAI-compatible APIs

Default Model

VISHNUDHAT/wazuh-llama-3.1-8b-assistant-Q4_K_M-GGUF

---

# Environment Variables

```env
LLM_PROVIDER=ollama

OLLAMA_BASE_URL=http://localhost:11434

OLLAMA_MODEL=VISHNUDHAT/wazuh-llama-3.1-8b-assistant-Q4_K_M-GGUF

HF_MODEL=VISHNUDHAT/wazuh-llama-3.1-8b-assistant-Q4_K_M-GGUF
```

---

# Frontend Structure

frontend/

```text
index.html
package.json
vite.config.js

src/

main.jsx

App.jsx

styles.css

services/
api.js

components/

ChatPanel.jsx

QueryPreview.jsx

InvestigationSummary.jsx

Dashboard.jsx
```

---

# Backend Structure

backend/

```text
main.py

app/

models/

services/

providers/

routes/

utils/

prompts/
```

---

# UI Layout

```text
+-----------------------------------------------------+

Query Sentinel AI

+----------------------+------------------------------+

Chat Panel

Generated Query

+----------------------+------------------------------+

Investigation Summary

+-----------------------------------------------------+

Dashboard Placeholder

+-----------------------------------------------------+
```

---

# API Endpoints

GET /health

POST /translate

POST /chat

Future

POST /hunt

GET /alerts

GET /dashboard

GET /mitre

GET /timeline

---

# Translation Flow

User

↓

React

↓

FastAPI

↓

LLM Provider

↓

Generated Elastic DSL

↓

Preview Query

↓

Execute Query

↓

Dashboard

↓

Summary

---

# Milestone 1 (In Progress)

Frontend

- Chat panel
- Query preview
- Investigation summary
- Dashboard placeholder
- API service

Backend

- FastAPI
- Translation endpoint
- Provider abstraction

Deliverable

Natural Language

↓

Elastic DSL

↓

Preview

No live execution yet.

---

# Milestone 2

Integrate Wazuh

Tasks

- Wazuh API client
- Elastic DSL execution
- Alert retrieval
- Aggregations
- Timeline
- Tables
- Charts

Dashboard becomes live.

---

# Milestone 3

LLM Improvements

Implement

Ollama Provider

Hugging Face Provider

Prompt Templates

Conversation Memory

Streaming Responses

Retry Logic

Error Handling

---

# Milestone 4

Investigation Layer

Generate

Investigation Summary

IOC Extraction

MITRE ATT&CK Mapping

Attack Chain

Risk Score

Confidence

Recommended Next Steps

---

# Milestone 5

Dashboard

Cards

Alerts

Timeline

Top Hosts

Top Users

MITRE Heatmap

Severity Distribution

Trend Graph

Live Refresh

---

# Milestone 6

RAG

Knowledge Sources

Wazuh Documentation

MITRE ATT&CK

Sigma Rules

YARA Rules

CVE Database

Threat Intelligence

FAISS / Chroma

---

# Milestone 7

Agentic Investigation

User:

Investigate suspicious PowerShell

Agent

↓

Translate

↓

Run Queries

↓

Correlate Events

↓

Collect Evidence

↓

Map MITRE

↓

Generate Report

↓

Recommend Response

---

# Future Integrations

Elastic

Splunk

Microsoft Sentinel

QRadar

CrowdStrike

Sigma

OpenSearch

---

# Non-Functional Goals

Explainability

Every generated query must be visible.

Never execute hidden AI actions.

Vendor Neutrality

Backend providers should be replaceable.

Self Hosted

No cloud dependency required.

Education

Teach analysts why a query was generated.

---

# Coding Standards

- Python 3.12+
- FastAPI
- React + Vite
- Docker Compose
- Type hints where possible
- Black formatting
- Modular services
- Environment-based configuration
- Clear separation between providers, business logic, and UI

---

# Immediate Next Tasks

1. Complete React component implementation.
2. Finish API service wiring.
3. Implement the Ollama provider.
4. Make `VISHNUDHAT/wazuh-llama-3.1-8b-assistant-Q4_K_M-GGUF` the default model.
5. Connect `/translate` to the real model.
6. Build the Wazuh API client.
7. Execute generated Elastic DSL.
8. Populate the dashboard with live data.
9. Add MITRE ATT&CK enrichment.
10. Generate AI investigation summaries.

---

# Long-Term Vision

Query Sentinel AI should become an explainable, vendor-neutral investigation copilot for security analysts.

The assistant should not simply convert natural language into queries. It should help analysts understand, trust, and accelerate investigations across multiple SIEM platforms while remaining fully open source and self-hosted.
