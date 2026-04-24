# FEAT-AUTOEXEC: Auto-Executer Script

## Overview

The Auto-Executer is a command-line script that automates the implementation of tasks defined in a `plan-*.json` file. It interfaces with OpenCode (via SDK) to execute tasks autonomously within a sandbox, running tests, and committing changes. The script acts as a meta-executor: it reads implementation plans and delegates actual code changes to OpenCode agents.

**Goal:** Reduce manual intervention in implementing pre-defined tasks by allowing an AI agent (OpenCode) to work through a plan systematically, with configurable oversight levels.

---

## Functional Requirements

### FR-1: Plan Loading and Task Discovery

- The script accepts a `plan-*.json` file path as input (via CLI argument).
- The script validates the JSON against the schema (`schema.json`).
- The script identifies the first task with `status: "pending"` that has all dependencies satisfied.
- If no pending tasks remain, the script reports completion and exits.

### FR-2: Task Information Extraction

- For each selected task, the script extracts: `id`, `whatToDo`, `stories`, `size`, `definitionOfDone`, `dependsOn`.
- The script builds a structured prompt for OpenCode containing all necessary context.

### FR-3: OpenCode Integration (Task Implementation)

- The script uses the OpenCode SDK to launch an agent instance.
- The agent receives detailed instructions: task description, definition of done, project context, constraints.
- The agent operates with **maximum permissions within a sandbox**: file creation, editing, deletion of non-protected paths, git operations.
- Sandbox constraints (see FR-NF1).

### FR-4: Test Execution

- After the implementation agent completes, the script asks OpenCode to recommend which tests to run.
- The script executes the recommended test commands via shell.
- The script captures and reports test results (pass/fail/output).

### FR-5: Error Handling and Retry Loop

- If tests fail, the script asks OpenCode to fix the issues.
- Maximum **10 fix attempts** per task.
- After 10 failed attempts, the script halts and reports the task as blocked.
- A summary of all attempts is logged.

### FR-6: Commit Generation

- After successful tests, the script asks OpenCode to generate a commit message.
- The commit message follows the project's conventions (references task ID and user stories).
- The script executes `git add` and `git commit` with the generated message.

### FR-7: Plan State Update

- After each successful task, the script updates the `plan-*.json`:
  - Sets task `status` to `"completed"`.
  - Records test results and any notes.
- The updated plan is written back to the file.

---

## Execution Modes

### Interactive Mode (Approval-Based)

- Before each task, the script pauses and asks the user to confirm:
  ```
  Task T-XX (size: Medium) - "[whatToDo summary]"
  Stories: US-001, US-002
  Dependencies: T-01, T-03 (all completed)
  
  Proceed? [Y/n]
  ```
- User can approve, skip, or abort the entire run.
- After implementation, before commit, user is again prompted: `[y/N]` (default: no, requiring explicit approval).

### Autonomous Mode (Unattended)

- The script processes all pending tasks sequentially without pausing.
- User is only prompted for critical errors or after the 10-retry limit is reached.
- Suitable for overnight runs or trusted environments.

---

## Model Selection

At script startup, the user can select the OpenCode model to use for agent instances. This allows:
- Choosing a fast/cheap model for simple tasks.
- Choosing a capable model for complex tasks.
- Default model can be set via environment variable or config.

Model selection is presented as a list or dropdown at startup.

---

## Non-Functional Requirements

### NFR-1: Sandbox Constraints (Security)

The script operates within a defined sandbox. **Protected paths** (never modified by the agent):
- `.git/` (repository metadata)
- `*.json` (plan files — only the script updates these)
- `node_modules/` (dependencies — read-only)
- `docs/requirements/` (requirements documents — read-only)
- `schema.json` (schema definition — read-only)

The agent can create, modify, or delete files in any other path.

### NFR-2: Idempotency

- Re-running the script on a plan where all tasks are completed should report "All tasks completed" and exit cleanly.
- Re-running after a blocked task should resume from the blocked task.

### NFR-3: Logging

- All operations are logged with timestamps to `auto-executer.log`.
- Log includes: task ID, operation type, OpenCode agent output (truncated), result, duration.

### NFR-4: Configurability

- Default mode (interactive/autonomous) configurable via environment variable `AUTOEXEC_MODE`.
- Default OpenCode model configurable via environment variable `OPENCODE_MODEL`.
- Config file `auto-executer.config.json` for persistent preferences.

### NFR-5: Progress Visibility

- Console output shows: current task, progress bar (e.g., `T-07 [3/17]`), elapsed time.
- On completion, a summary table: task ID, status, duration, retry count.

### NFR-6: Language

- The script and all output are in English by default.
- User-facing prompts and messages use English.

---

## User Stories

### US-AE-001: Load and Validate Plan

**As a** developer,
**I want** the script to accept a plan JSON file and validate it,
**So that** I can be confident the script understands the task structure.

**Acceptance Criteria:**
- [ ] Script accepts `plan-*.json` path as CLI argument
- [ ] Script exits with clear error if JSON is invalid or missing
- [ ] Script exits with clear error if plan does not match `schema.json`
- [ ] Script prints plan title and task count on success

---

### US-AE-002: Find Next Executable Task

**As a** developer,
**I want** the script to automatically find the next pending task whose dependencies are all met,
**So that** I don't have to manually track what to work on.

**Acceptance Criteria:**
- [ ] Script identifies first task with `status: "pending"`
- [ ] Script verifies all IDs in `dependsOn` have `status: "completed"` or `"skipped"`
- [ ] Script skips tasks with `status: "skipped"` or `"cancelled"`
- [ ] Script reports "No pending tasks" when all are done or blocked

---

### US-AE-003: Execute Task via OpenCode

**As a** developer,
**I want** the script to send the task details to OpenCode and let it implement the code,
**So that** I can focus on higher-level work while the implementation happens automatically.

**Acceptance Criteria:**
- [ ] OpenCode receives a structured prompt with task description, DoD, stories
- [ ] OpenCode operates within sandbox constraints (no protected paths)
- [ ] OpenCode can create/edit/delete files outside protected paths
- [ ] OpenCode stops and reports if it cannot complete the task
- [ ] Script captures OpenCode's final status and any output

---

### US-AE-004: Run Tests After Implementation

**As a** developer,
**I want** the script to ask OpenCode which tests to run, then execute them,
**So that** I know the implementation is correct before committing.

**Acceptance Criteria:**
- [ ] Script prompts OpenCode for test commands based on the task
- [ ] Script executes the recommended commands via shell
- [ ] Script captures stdout/stderr and exit code
- [ ] Script reports clear pass/fail status for each test
- [ ] Script halts and enters fix loop on test failure

---

### US-AE-005: Fix Failed Implementations

**As a** developer,
**I want** the script to ask OpenCode to fix failing tests,
**So that** the implementation eventually passes without manual intervention.

**Acceptance Criteria:**
- [ ] On test failure, script asks OpenCode to analyze errors and apply fixes
- [ ] Script re-runs tests after each fix attempt
- [ ] Script tracks attempt count (1-10)
- [ ] After 10 failures, script halts with "BLOCKED" status
- [ ] Blocked task is marked with error summary in the plan

---

### US-AE-006: Generate and Execute Commit

**As a** developer,
**I want** the script to ask OpenCode for a commit message and then commit the changes,
**So that** the git history is clean and traceable.

**Acceptance Criteria:**
- [ ] On test success, script asks OpenCode for a commit message
- [ ] Commit message references task ID (e.g., `T-07`) and story IDs (e.g., `US-003`)
- [ ] Script runs `git add` and `git commit` with the message
- [ ] Script reports the commit hash after success
- [ ] Git status is clean after commit (no uncommitted changes from this task)

---

### US-AE-007: Update Plan State

**As a** developer,
**I want** the script to update the plan JSON after each task,
**So that** the plan reflects the current state and can be resumed.

**Acceptance Criteria:**
- [ ] Task status changed to `"completed"` after success
- [ ] `definitionOfDone` items marked as completed where applicable
- [ ] Notes field updated with test results and duration
- [ ] Plan JSON written back to the original file path

---

### US-AE-008: Interactive Confirmation

**As a** developer,
**I want** to confirm each task before it runs (interactive mode),
**So that** I can review the scope and prevent unwanted changes.

**Acceptance Criteria:**
- [ ] Before running a task, script prints task summary and asks for confirmation
- [ ] User can approve (`Y`), skip task (`s`), or abort entire run (`a`)
- [ ] Before commit, script asks for confirmation in interactive mode
- [ ] Confirmation prompts clearly show task ID and summary

---

### US-AE-009: Autonomous Execution

**As a** developer,
**I want** the script to run all pending tasks without stopping (autonomous mode),
**So that** I can start a long run and let it complete.

**Acceptance Criteria:**
- [ ] Script processes tasks sequentially without user input
- [ ] Only critical errors or max-retry failures cause prompts
- [ ] Progress bar shows current task and overall progress
- [ ] Summary report shown at end of run

---

### US-AE-010: Select OpenCode Model

**As a** developer,
**I want** to choose which model OpenCode uses for agent instances,
**So that** I can balance speed, cost, and capability.

**Acceptance Criteria:**
- [ ] At startup, script presents a list of available models
- [ ] User can select model interactively or via command-line argument
- [ ] Default model is configurable via environment variable
- [ ] Model selection is logged and shown in output

---

## Dependencies and Constraints

- **OpenCode SDK:** The script requires the OpenCode SDK (`@opencode/sdk` or equivalent) to be installed.
- **Node.js:** The script is implemented in Node.js (JavaScript/TypeScript) for portability.
- **Git:** The script relies on `git` for version control operations.
- **Schema:** The script reads `schema.json` for plan validation (assumed to exist in the project root).
- **Out of Scope:** The script does not implement OpenCode itself; it only interfaces with it.

---

## Open Questions

> **Note:** Le risposte alle seguenti domande sono state definite in una sessione di review con l'utente. Fare riferimento a questa sezione come source of truth.

### OQ-1: OpenCode SDK Interface ✅

**Decisione:** Uso di `@opencode-ai/sdk` (npm).

**Dettagli:**
- Installazione: `npm install @opencode-ai/sdk`
- API principale:
  - `createOpencode()` → `{ client }` per creare server+client embedded
  - `createOpencodeClient({ baseUrl })` → per connettersi a server esistente
- Il client espone `session.prompt({ path, body })` per inviare prompt e ottenere risposte
- Supporto per risposte streaming e JSON strutturato via `format: { json: true }`
- Autenticazione gestita da OpenCode (API keys via env vars: `OPENAI_API_KEY`, etc.)

### OQ-2: Test Discovery ✅

**Decisione:** Approccio ibrido (OpenCode suggerisce + pattern matching fallback).

**Dettagli:**
- Primary: Chiede a OpenCode di generare comandi di test basandosi su:
  - Tipo di task (backend/frontend/fullstack)
  - File modificati dal task
  - `definitionOfDone` del task
- Fallback: Pattern matching su convenzioni note:
  - `*.spec.ts`, `*.test.ts`
  - Cartelle: `tests/`, `__tests__/`, `test/`
  - Comandi comuni: `npm test`, `npm run test`, `dotnet test`, `pytest`, etc.

### OQ-3: Concurrency ✅

**Decisione:** Fuori scope per v1. Esecuzione sequenziale.

**Dettagli:**
- I task vengono eseguiti uno alla volta
- Semplifica logging, gestione errori e recovery
- Implementazione futura: opzionale con flag `--parallel`

### OQ-4: Rollback ✅

**Decisione:** Nessun rollback automatico.

**Dettagli:**
- L'utente gestisce manualmente eventuali rollback
- Lo script non sovrascrive mai modifiche non committate
- Utente può ispezionare lo stato con `git status` tra un task e l'altro

### OQ-5: Protected Paths on Windows ✅

**Decisione:** Solo `.git/` è protetto. Path normalizzati per cross-platform.

**Dettagli:**
- Lista protetta: **solo** `.git/` (repository metadata)
- Node.js gestisce `/` in modo cross-platform tramite `path.normalize()`
- L'agente può creare/modificare/eliminare tutto tranne `.git/`
- `node_modules/`, `*.json`, `docs/requirements/` NON sono protetti

### OQ-6: OpenCode Authentication ✅

**Decisione:** Delegata a OpenCode stesso.

**Dettagli:**
- API keys configurate tramite `opencode config set` o env vars
- Lo script si appoggia a configurazione OpenCode esistente
- Requisito: OpenCode deve essere configurato e funzionante prima di eseguire lo script