# AI Crawler Contract v1

PromptOS treats automated public access as a governed discovery surface, not an automatic license to ingest the prompt system.

## Default intent
- Allow reputable search/discovery and user-directed retrieval only for deliberately public PromptOS explanations and canonical public evidence.
- Deny model-training and bulk dataset collection by default.
- Never expose private prompts, proprietary prompt content, provider responses, workflow logs, credentials, governance-only material, or unpublished drafts through crawler surfaces.
- Request canonical source attribution when supported.
- Crawler access is read-only and never grants merge, publication, deployment, credential, provider, or founder authority.

## Bot split
`OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`, and `Googlebot` may be allowed on verified public surfaces. `GPTBot`, `ClaudeBot`, and `Google-Extended` are denied by default.

## Publication boundary
This contract does not claim a crawler endpoint is live. PromptOS `SITES.md` currently keeps the ChatGPT Site identity unverified, and any GitHub Pages/runtime crawler assets must be verified on the actual publication path before being called active.

`robots.txt` is preference, not authentication. Private and proprietary material remains protected independently.
