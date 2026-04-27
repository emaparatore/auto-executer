# FEAT-2 — OpenCode Auto Executor (TypeScript)
**Status:** Draft for review  
**Owner:** <tuo nome/team>  
**Created:** 2026-04-23  
**Target stack:** TypeScript + OpenCode SDK  
**Primary audience:** sviluppatori che vogliono eseguire automaticamente task da piano con controllo sandbox/permessi
---
## 1) Obiettivo
Realizzare uno strumento (CLI-first, con possibile GUI successiva) che:
1. Legga un piano di implementazione (es. `docs/plans/PLAN-1.md`) prodotto dal workflow requirements-workflow
2. Esegua i task **uno alla volta** con OpenCode SDK
3. Operi in **sandbox** con policy di sicurezza esplicite
4. Gestisca in modo semplice e sicuro i **permessi dell’agente**
5. Mantenga tracciabilità completa: task -> modifiche -> test -> stato piano -> log run
---
## 2) Visione e principi
- **Traceability-by-default:** ogni esecuzione deve essere riconducibile a task/storia.
- **Safety-by-default:** nessuna modalità non sandboxata ad alto rischio.
- **Determinismo operativo:** engine a stati, retry controllati, stop su gate decisionali.
- **Human-in-the-loop opzionale:** review mode con approvazione mini-plan e/o step.
- **Evolvibilità formato piano:** supporto Markdown iniziale + modello strutturato manipolabile.
---
## 3) Stakeholder e utenti
- **Developer singolo**: usa il tool localmente per implementare task in autonomia controllata.
- **Tech lead**: definisce policy permessi/sandbox e revisiona run.
- **Team**: usa output/log come record tecnico e audit trail.
---
## 4) Ambito (Scope)
## In scope (MVP)
- CLI completa
- Integrazione OpenCode SDK in TypeScript
- Parsing piano markdown (formato stile `PLAN-1.md`)
- Selezione prossimo task pending e lifecycle task-by-task
- Sandbox execution obbligatoria per modalità ad alta autonomia
- Gestione policy permessi per fase (plan/exec/fix/update)
- Verify automatica (build/test) basata sui path toccati
- Retry/fix loop con limiti
- Aggiornamento stato piano + logging run
- Modello dati run persistente (JSONL o SQLite)
- Supporto decision gate (`⚠️ DECISION REQUIRED`) e protected paths (`🔒 INTERACTIVE ONLY`)
## Out of scope (MVP)
- Web GUI completa (ammessa solo come viewer minimale successivo)
- Multi-repository orchestration
- Scheduling distribuito enterprise
- Gestione segreti avanzata cloud-native (vault enterprise)
---
## 5) Requisiti funzionali
### FR-001 — Avvio run da piano
Il sistema deve avviare una run da un file piano markdown selezionato.
### FR-002 — Scoperta task
Il sistema deve identificare il primo task in stato pending/non completato.
### FR-003 — Esecuzione sequenziale
Il sistema deve eseguire un task per volta, aggiornando lo stato prima di passare al successivo.
### FR-004 — Mini-plan self-contained
Per ogni task, il sistema deve generare (o richiedere) un mini-plan self-contained usabile in sessione isolata.
### FR-005 — Modalità operative
Il sistema deve supportare almeno:
- `full` (autonomia con policy)
- `review` (approvazione umana)
- `yolo-sandboxed` (permessi ampi ma solo sandbox)
- `yolo-review` (permessi ampi + gate review)
### FR-006 — Policy permessi per fase
Il sistema deve applicare allow/disallow tool set differenziati per fase (`plan`, `exec`, `fix`, `update`, `commit`).
### FR-007 — Enforcement sandbox
Il sistema deve impedire modalità ad alto rischio fuori sandbox conforme (container isolation + policy attive).
### FR-008 — Verify automatica
Il sistema deve eseguire verifiche build/test mirate (backend/frontend) in base ai file modificati.
### FR-009 — Fix loop controllato
Se verify fallisce, il sistema deve rilanciare fase fix con max retry configurabile.
### FR-010 — Gestione rate limit / max turns
Il sistema deve rilevare rate limit e max-turns, proporre o applicare attese/retry secondo modalità.
### FR-011 — Decision gates
Se il task contiene `⚠️ DECISION REQUIRED`, il sistema deve fermarsi e richiedere decisione umana.
### FR-012 — Protected paths
Se il task è `🔒 INTERACTIVE ONLY`, il sistema deve saltarlo in autonomous mode e loggare motivazione.
### FR-013 — Aggiornamento piano
A task completato, il sistema deve aggiornare stato task, DoD, note implementative e coverage (se applicabile).
### FR-014 — Commit handling
Il sistema deve supportare commit per task con messaggio convenzionale (configurabile on/off).
### FR-015 — Log e audit trail
Il sistema deve produrre:
- log run umano leggibile
- log eventi strutturati (JSONL)
- metadati costi/tempi/fasi/tool call
### FR-016 — Resume run
Il sistema deve poter riprendere una run interrotta senza perdere contesto operativo.
### FR-017 — Dry-run
Il sistema deve supportare una modalità dry-run (nessuna modifica) per validare parsing, policy e sequenza task.
### FR-018 — Configurazione TypeScript-first
Il sistema deve avere config typed (es. `opencode-executor.config.ts`) con validazione schema.
### FR-019 — Compatibilità formato piano
Il sistema deve supportare:
1. piano markdown attuale
2. opzionalmente piano strutturato (JSON/YAML) per manipolazione robusta
### FR-020 — Migrazione formato piano
Il sistema deve offrire utility per convertire markdown -> struttura canonica (non distruttiva).
---
## 6) User Stories (con acceptance criteria)
### US-001 — Avvio semplice
Come developer voglio avviare il tool indicando un piano, così posso iniziare rapidamente una run.
- AC1: comando CLI accetta `--plan <path>`
- AC2: errore chiaro se piano non trovato/non valido
- AC3: visualizza riepilogo iniziale run (mode, sandbox, policy, branch)
### US-002 — Selezione prossima attività
Come developer voglio che il tool selezioni il prossimo task pending automaticamente.
- AC1: identifica task pending secondo regole piano
- AC2: se nessun task pending -> output `ALL_COMPLETE`
- AC3: task scelto viene loggato con ID e titolo
### US-003 — Esecuzione controllata per fase
Come tech lead voglio policy diverse per fase, così riduco rischio e costo.
- AC1: policy `plan/exec/fix/update` configurabili
- AC2: enforcement reale su tool non ammessi
- AC3: violazioni policy tracciate a log
### US-004 — Sicurezza sandbox
Come team voglio impedire modalità rischiose fuori sandbox.
- AC1: modalità `yolo-sandboxed` rifiutata fuori sandbox
- AC2: check isolamento + profilo sicurezza soddisfatti
- AC3: messaggio guida per avvio sandbox
### US-005 — Review umana
Come developer voglio approvare mini-plan prima dell’exec in review mode.
- AC1: mini-plan mostrato prima dell’esecuzione
- AC2: opzioni `approve / skip / quit`
- AC3: scelta registrata nel log eventi
### US-006 — Retry intelligente
Come developer voglio retry fix automatici dopo verify fallita.
- AC1: max retry configurabile
- AC2: errore verify passato come contesto fix
- AC3: dopo max retry il task è marcato failed/skipped con reason
### US-007 — Decision gates
Come product owner voglio bloccare automazione sui punti decisionali.
- AC1: rileva `⚠️ DECISION REQUIRED`
- AC2: stop run sul task corrente
- AC3: resume solo dopo decisione esplicita registrata
### US-008 — Protected paths
Come security reviewer voglio che task su percorsi protetti non siano auto-eseguiti.
- AC1: rileva `🔒 INTERACTIVE ONLY`
- AC2: task saltato in autonomous mode
- AC3: motivo skip visibile nei report
### US-009 — Tracciabilità run completa
Come team voglio avere log strutturati per audit e debug.
- AC1: JSONL completo di fasi/tool/result
- AC2: summary leggibile per umani
- AC3: correlazione run-id/task-id presente ovunque
### US-010 — Piano manipolabile
Come maintainer voglio un formato piano strutturato per evitare parsing fragile.
- AC1: schema canonico task (`id,title,status,depends_on,stories,dod,...`)
- AC2: conversione da markdown disponibile
- AC3: sincronizzazione md <-> structured documentata
### US-011 — Resume affidabile
Come developer voglio riprendere una run dopo stop/crash.
- AC1: persistenza stato fase/task/retry
- AC2: resume idempotente senza duplicare step conclusi
- AC3: marker run interrotto + recovery path
### US-012 — Dry-run di validazione
Come tech lead voglio simulare la run senza scrivere codice.
- AC1: nessuna modifica filesystem/git
- AC2: verifica parsing piano e policy
- AC3: report finale con criticità e warning
---
## 7) Requisiti non funzionali (NFR)
### NFR-001 — Sicurezza
- Default deny sui tool non esplicitamente permessi
- No execution ad alto rischio fuori sandbox
- Log di sicurezza non disattivabile in mode autonoma
### NFR-002 — Affidabilità
- Resume robusto dopo crash/interruzione
- Retry deterministici e bounded
- Gestione errori con codici e messaggi action-oriented
### NFR-003 — Performance
- Startup CLI < 3s su repo medio
- Parsing piano < 1s per piani <= 2k linee
- Overhead orchestrator minimo rispetto alle chiamate LLM
### NFR-004 — Osservabilità
- Correlation IDs per run e task
- Metriche minime: durata fase, retry count, costo stimato, esito
### NFR-005 — Manutenibilità
- Codice TypeScript tipizzato strict
- Architettura modulare (parser, orchestrator, policy, sandbox, reporter)
- Test coverage minima target 80% sui moduli core
### NFR-006 — Portabilità
- Supporto dev environment principali (Windows/WSL/Linux/macOS) con sandbox Docker
---
## 8) Modello dati canonico (proposto)
Entità minime:
- `Plan` (id, sourcePath, version, tasks[])
- `Task` (id, title, status, stories[], dependsOn[], dod[], flags[])
- `Run` (runId, planId, mode, startedAt, status)
- `RunTask` (taskId, phase, attempts, status, artifacts)
- `PolicyProfile` (name, phaseRules, sandboxRules)
- `ExecutionEvent` (timestamp, runId, taskId, phase, eventType, payload)
---
## 9) Vincoli e dipendenze
- Linguaggio: **TypeScript**
- Runtime: Node.js LTS
- SDK: OpenCode SDK
- Sandbox: Docker (profilo dedicato)
- Repo Git richiesto
- Compatibilità iniziale con struttura piani in `docs/plans/*.md`
---
## 10) Assunzioni
- I piani seguono convenzioni simili a `PLAN-1.md` (task ID, status, DoD, depends on)
- Esiste una pipeline di build/test invocabile via CLI
- Il team accetta approccio CLI-first con GUI in fase successiva
---
## 11) Rischi principali e mitigazioni
- Parsing markdown fragile -> introdurre schema strutturato canonico + converter
- Escalation permessi non voluta -> policy default-deny + sandbox enforcement hard
- Costi/loop agentici -> max-turns, retry bounded, stop conditions, dry-run
- Drift documentazione/piano -> update plan obbligatorio a fine task + check automatici
---
## 12) Decisioni aperte (checkpoint)
### D-001 — Strategia interfaccia iniziale
- Opzione A: CLI-only MVP (consigliata)
- Opzione B: CLI + viewer web minimale
- Opzione C: GUI-first
**Raccomandazione:** A, poi B
### D-002 — Fonte canonica del piano
- Opzione A: markdown canonico
- Opzione B: structured canonico (JSON/YAML) + markdown view (consigliata)
**Raccomandazione:** B
### D-003 — Persistenza stato run
- Opzione A: solo JSONL
- Opzione B: SQLite + export JSONL (consigliata)
**Raccomandazione:** B
### D-004 — Commit automatici
- Opzione A: sempre on
- Opzione B: configurabile per run/profilo (consigliata)
**Raccomandazione:** B
---
## 13) Criteri di successo feature
La feature è considerata riuscita se:
1. Esegue in modo affidabile almeno 10 task consecutivi su piano reale senza interventi non previsti
2. Blocca correttamente i casi `DECISION REQUIRED` e `INTERACTIVE ONLY`
3. Fornisce log sufficienti per ricostruire completamente una run
4. Riduce errore operativo rispetto a script bash ad-hoc
5. È estendibile a GUI senza riscrivere il core
---
## 14) Tracciabilità iniziale Story -> Area implementativa
- US-001..US-003 -> Orchestrator + CLI + Parser
- US-004 -> Sandbox Manager + Security Checks
- US-005 -> Review Gateway
- US-006 -> Verify/Fix Engine
- US-007..US-008 -> Plan Semantics Engine
- US-009 -> Logging/Reporting
- US-010 -> Plan Model + Converter
- US-011 -> Run State Store
- US-012 -> Dry Run Mode
---
## 15) Note finali
Questo documento definisce i requisiti completi per passare a **Phase 2 (Plan)** del workflow requirements-workflow.  
Prima di pianificare, serve confermare le decisioni D-001..D-004.