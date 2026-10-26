# Autonomous Execution & Workflow Guidelines

## 1. Full Autonomy & Zero Friction
- **Never pause for manual confirmation**: Do not prompt the user with interactive choice modals (`ask_question`) unless strictly blocked.
- **Make smart engineering decisions**: Pick the most standard, reliable, and modern approach automatically.
- **Proceed directly with execution**: If creating a plan or task breakdown, proceed with implementation immediately without setting `RequestFeedback: true` on artifacts.

## 2. Automatic Problem Resolution
- **Self-Healing**: If a command, build, or test fails, diagnose the error and fix it autonomously instead of stopping to ask what to do.
- **Verify and Finish**: Keep iterating until the requested task is fully tested, verified, and complete.

## 3. Clear & Concise Reporting
- When finished, summarize what was done, what was verified, and how the user can use or see the result.
