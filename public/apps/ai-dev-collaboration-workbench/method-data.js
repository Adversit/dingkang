const stages = [
  {
    id: "explore", name: "Explore", question: "What is the real problem or outcome?", exit: "The problem boundary is useful enough to reason about.", freedom: "High AI freedom",
    state: "I only have a vague idea", human: "The outcome worth pursuing and whose problem matters.", ai: "Surface assumptions, explore alternatives, and sketch the simplest useful boundary.",
    fields: [["Observed situation", "What is happening now, without explaining it away?"], ["Desired outcome", "What judgment or capability should improve?"], ["Candidate framing", "A provisional problem statement—not yet a solution."]],
    evidence: ["A concrete user or business outcome", "Irreducible facts separated from assumptions", "At least one example or counterexample"]
  },
  {
    id: "align", name: "Align", question: "What matters, and what constrains us?", exit: "The decision space is bounded.", freedom: "Broad, bounded",
    state: "I know the goal, but requirements are unclear", human: "Priorities, non-goals, appetite, and meaningful trade-offs.", ai: "Structure goals and constraints, find conflicts, and propose candidate assumptions.",
    fields: [["Success criteria", "What observable result would count as success?"], ["Constraints", "Time, platform, policy, data, cost, compatibility…"], ["Non-goals", "What is intentionally outside this effort?"]],
    evidence: ["Success can be observed", "Hard constraints are explicit", "Non-goals prevent scope drift"]
  },
  {
    id: "specify", name: "Specify", question: "What must be true?", exit: "Desired behavior can be checked.", freedom: "Moderate AI freedom",
    state: "I need a checkable specification", human: "Behavioral intent and any domain judgment behind acceptance.", ai: "Draft requirements, boundary scenarios, and discriminating acceptance examples.",
    fields: [["Required behavior", "Write an outcome-oriented statement, not an implementation task."], ["Acceptance example", "Given… When… Then…"], ["Failure boundary", "What wrong behavior must the spec reject?"]],
    evidence: ["Requirements describe behavior", "Boundary scenarios are explicit", "A wrong implementation would fail the check"]
  },
  {
    id: "decide", name: "Decide", question: "Which consequential option do we choose?", exit: "The key choice has an owner and rationale.", freedom: "Choice-focused",
    state: "I’m weighing consequential options", human: "Accept the trade-off and own irreversible or high-impact choices.", ai: "Derive options from needs, compare evidence, and make consequences visible.",
    fields: [["Decision", "Which option is chosen?"], ["Alternatives considered", "What plausible options were rejected, and why?"], ["Revisit condition", "What future evidence should reopen this decision?"]],
    evidence: ["Alternatives were plausible", "Consequences are acknowledged", "Decision owner is clear"]
  },
  {
    id: "plan", name: "Plan", question: "How will we make the spec true?", exit: "Work can proceed in coherent, verified increments.", freedom: "Constrained",
    state: "I know the direction; I need a plan", human: "Priority, sequencing appetite, and acceptance of delivery risk.", ai: "Decompose the selected path, expose dependencies, and test high-impact uncertainty early.",
    fields: [["Risk-first slice", "What smallest experiment can invalidate the approach?"], ["Execution increments", "List coherent steps that each produce an observable result."], ["Verification path", "How will each increment be checked?"]],
    evidence: ["Spec, decision, plan, and tasks are separate", "High-impact unknowns are tested early", "Each increment has a verification method"]
  },
  {
    id: "execute", name: "Execute", question: "What is the smallest useful change?", exit: "An observable result exists.", freedom: "Low AI freedom",
    state: "I’m ready to build the smallest loop", human: "Approve exceptions when evidence invalidates the selected path.", ai: "Implement deterministically, preserve boundaries, and surface blockers rather than guessing.",
    fields: [["Current task", "One concrete executable unit."], ["Expected observable result", "What should exist or change after this task?"], ["Execution boundary", "What must this task not decide or modify?"]],
    evidence: ["Change maps to a confirmed plan item", "Result is observable", "No unresolved decision is hidden in the task"]
  },
  {
    id: "verify", name: "Verify", question: "Did the result satisfy intent?", exit: "Gaps are explicit and evidence is preserved.", freedom: "Evidence-led",
    state: "I have a result; I need evidence", human: "Final subjective acceptance and domain judgments evidence cannot replace.", ai: "Compare expected and actual, run discriminating checks, and classify failures.",
    fields: [["Expected", "What should be true according to the spec?"], ["Actual", "What happened, with evidence location?"], ["Gap classification", "Implementation, spec, decision, environment/data, or accepted difference?"]],
    evidence: ["Expected and actual are directly compared", "Checks are hard to pass accidentally", "Logs, tests, screenshots, or metrics are preserved"]
  },
  {
    id: "converge", name: "Converge", question: "What remains, and when do we stop?", exit: "The result is accepted or routed to the correct earlier stage.", freedom: "Gap-focused",
    state: "The result still has gaps", human: "Accept remaining differences or reopen a value-laden decision.", ai: "Classify each gap, fix it at the correct layer, and re-check against intent.",
    fields: [["Remaining gap", "Describe the difference without saying only ‘make it better’."], ["Correct layer", "Implementation, specification, decision, or environment?"], ["Stop condition", "What evidence ends this iteration?"]],
    evidence: ["Every gap has a classification", "Fix targets the correct layer", "Stop condition is explicit"]
  },
  {
    id: "learn", name: "Learn", question: "What should persist?", exit: "Reusable learning is recorded at the right scope.", freedom: "Curated",
    state: "I want to preserve reusable learning", human: "Decide what is stable enough to become shared practice.", ai: "Extract repeatable lessons, update the right artifact, and avoid overfitting one case.",
    fields: [["Observed lesson", "What did real collaboration reveal?"], ["Generality test", "Where else would this lesson hold—and where would it fail?"], ["Artifact to update", "Spec, ADR, rule, reference, script, or skill release?"]],
    evidence: ["Lesson is supported by observed work", "Project detail is separated from reusable behavior", "Change is recorded with a reason"]
  }
];

const stageDetails = {
  explore: { why: "Early requests often name a solution before the real problem is understood.", what: "Inspect context, users, constraints, unknowns, evidence and adjacent possibilities.", intent: "Protect the problem space from premature closure.", input: "Vague idea, symptoms, references, partial examples and stakeholder concerns.", output: "Problem frame, unknowns, evidence inventory and candidate directions.", key: "What outcome matters? What are we assuming? What evidence would change the frame?", error: "Generating features or architecture before identifying the real outcome." },
  align: { why: "People and AI can use the same words while optimizing for different outcomes.", what: "Align goal, priority, scope, stakeholders, success and authority boundaries.", intent: "Prevent locally correct work that solves the wrong problem.", input: "Problem frame, candidate outcomes and stakeholder expectations.", output: "Agreed goal, non-goals, priority order, owners and acceptance authority.", key: "Who decides? What is out of scope? Which conflict has priority?", error: "Treating polite agreement as proof that definitions and priorities match." },
  specify: { why: "Goals are not executable until behaviors, boundaries and evidence are explicit.", what: "Define scenarios, interfaces, data, constraints, edge cases and acceptance criteria.", intent: "Turn intent into a testable contract without overdesigning the solution.", input: "Aligned goal, users, current system and known constraints.", output: "Behavioral specification, examples, non-goals and measurable acceptance criteria.", key: "What must happen? What must never happen? What proves success?", error: "Writing vague aspirations or prematurely encoding one technical design." },
  decide: { why: "Unresolved alternatives leak into implementation as hidden inconsistency.", what: "Compare options, choose, and record rationale, trade-offs and revisit triggers.", intent: "Make irreversible or high-impact choices human-owned and auditable.", input: "Specification, candidate solutions, constraints, experiments and evidence.", output: "Decision record, rejected alternatives, consequences and revisit condition.", key: "What are we optimizing? What do we give up? What evidence would reverse this?", error: "Saving only the final choice and losing why it was made." },
  plan: { why: "Even a good design fails when dependencies and checkpoints are unclear.", what: "Decompose work, order dependencies and define interfaces, checks and handoffs.", intent: "Make the next safe action obvious and keep changes reviewable.", input: "Decisions, architecture, acceptance criteria and current repository state.", output: "Execution sequence, task boundaries, risk controls and verification points.", key: "What must be true first? What can run in parallel? Where should we stop and check?", error: "Listing files to edit without explaining behavioral dependencies or checks." },
  execute: { why: "Implementation is where uncontrolled AI creativity becomes expensive.", what: "Apply bounded changes, preserve contracts, record deviations and run checks.", intent: "Turn decisions into working artifacts without silently changing the problem.", input: "Plan, source context, interfaces, constraints and acceptance criteria.", output: "Working increment, change record, check results and surfaced exceptions.", key: "Is this within scope? Did an assumption change? Is a new decision required?", error: "Letting incidental refactors or feature ideas expand the authorized scope." },
  verify: { why: "Successful execution does not prove that the intended outcome was achieved.", what: "Compare expected and actual behavior using predeclared evidence.", intent: "Ground acceptance in observable evidence rather than confidence or effort.", input: "Implementation, criteria, test cases, logs, screenshots and measurements.", output: "Evidence-linked results, gaps, severity and retest needs.", key: "What was expected? What occurred? Is the evidence sufficient and reproducible?", error: "Using “implemented” or “tests ran” as a substitute for acceptance." },
  converge: { why: "Verification can expose many gaps, not all of which deserve another cycle.", what: "Prioritize gaps, fix material ones, retest and make the acceptance decision.", intent: "Resolve consequential mismatches without uncontrolled polishing.", input: "Verification results, gap severity, costs and stakeholder judgment.", output: "Accepted result, deferred gaps, known limitations and closure record.", key: "Which gap blocks the goal? Which can be deferred? Who accepts residual risk?", error: "Fixing every visible imperfection without considering impact or scope." },
  learn: { why: "Finished work contains reusable patterns, failed assumptions and evidence.", what: "Extract patterns and update templates, tests, prompts, rules and method versions.", intent: "Make the next collaboration cheaper, safer and more precise.", input: "Decisions, implementation history, evidence, feedback and failure cases.", output: "Reusable knowledge, evaluation cases, release notes and method changes.", key: "What generalized? What was context-specific? What should change next time?", error: "Writing a retrospective that never updates an operational artifact." }
};

const entryStates = [
  { label: "I only have a vague idea", stage: "explore", route: ["Explore", "Align", "Specify"], note: "Start by separating the real problem from the first proposed solution." },
  { label: "I know the goal but requirements are unclear", stage: "align", route: ["Align", "Specify", "Decide"], note: "You probably don’t need Explore unless the goal itself becomes disputed." },
  { label: "I am designing the architecture", stage: "specify", route: ["Specify", "Decide", "Plan"], note: "Make responsibilities, interfaces and flow types explicit before planning work." },
  { label: "Architecture is decided and I need an implementation plan", stage: "plan", route: ["Plan", "Execute", "Verify"], note: "You probably don’t need Explore / Align unless a new contradiction appears." },
  { label: "I am implementing", stage: "execute", route: ["Execute", "Verify", "Converge"], note: "Keep AI freedom low and surface any decision the plan did not authorize." },
  { label: "Implementation is finished and I need verification", stage: "verify", route: ["Verify", "Converge", "Learn"], note: "Compare Expected vs Actual before deciding whether the work is acceptable." },
  { label: "I am debugging a mismatch", stage: "converge", route: ["Converge", "Verify"], note: "Classify the gap first: implementation, specification, decision, environment or data." },
  { label: "The task is finished and I want to extract reusable knowledge", stage: "learn", route: ["Learn"], note: "Promote only evidence-backed lessons into reusable artifacts." }
];

const templates = [
  {
    id: "module-card", name: "Module card", why: "Make a responsibility boundary explainable and testable.",
    content: `# Module: [Name]\n\n## WHAT\n[What does this module do?]\n\n## WHY\n[Why is it necessary? What breaks if it is removed?]\n\n## INTENT\n[What property does this design protect?]\n\n## INPUT\n[Inputs and state read]\n\n## OUTPUT\n[Outputs and state modified]\n\n## CONSTRAINTS\n[Hard boundaries]\n\n## EVAL\n[Discriminating checks]\n\n## RISKS\n[Failure modes, coupling, safety or scale risks]`
  },
  {
    id: "adr", name: "Architecture decision record", why: "Preserve why a consequential option won.",
    content: `# ADR-[NNN]: [Decision title]\n\n## Context\n[Problem, constraints, and why a decision is needed]\n\n## Decision\n[Chosen option]\n\n## Alternatives\n[Other plausible options]\n\n## Why\n[Why this option won]\n\n## Trade-offs\n[What the choice gives up]\n\n## Consequences\n[Positive and negative downstream effects]\n\n## Revisit condition\n[Evidence or event that should reopen this decision]`
  },
  {
    id: "verification-plan", name: "Verification plan", why: "Compare expected and actual with evidence that can falsify the result.",
    content: `# Verification Plan\n\nExpected → Actual → Gap → Fix → Retest\n\n| Acceptance criterion | Evidence | Verification method | Result | Status |\n|---|---|---|---|---|\n| [What must be true] | [Inspectable proof] | [How to check] | [Observed result] | Pending / Pass / Fail |\n\n## Gap\n[Meaningful difference between expected and actual]\n\n## Fix\n[Smallest change that addresses the cause]\n\n## Retest\n[Repeatable evidence path]`
  }
];

