import type { ChallengeTemplate } from "../../game/types";
import { boundedDifficulty, code, singleChallenge } from "../shared";

const TRACK = "code-reading" as const;

export const filteredTotalOutputTemplate: ChallengeTemplate = {
  id: "reading.output-filtered-total.v1",
  track: TRACK,
  concepts: ["code-reading", "output-prediction", "control-flow", "arrays"],
  minDifficulty: 0.35,
  maxDifficulty: 1.45,
  generate(rng, targetDifficulty) {
    const collection = rng.pick(["readings", "sizes", "latencies"]);
    const threshold = rng.int(5, 8);
    const values = rng.shuffle([
      threshold - 3,
      threshold + 4,
      threshold - 1,
      threshold + 1,
    ]);
    const acceptedTotal = threshold * 2 + 5;
    const rejectedTotal = threshold * 2 - 4;
    const allTotal = threshold * 4 + 1;

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Total the accepted readings",
      code: code([
        `fn main() {`,
        `    const MIN: i32 = ${threshold};`,
        `    let ${collection} = [${values.join(", ")}];`,
        `    let mut total = 0;`,
        ``,
        `    for value in ${collection} {`,
        `        if value >= MIN { total += value; }`,
        `    }`,
        ``,
        `    println!("{total}");`,
        `}`,
      ]),
      question: "What does this program print?",
      interactionType: "output-prediction",
      answers: [
        { id: "accepted-total", label: String(acceptedTotal) },
        { id: "all-total", label: String(allTotal) },
        { id: "accepted-count", label: "2" },
        { id: "rejected-total", label: String(rejectedTotal) },
      ],
      correctAnswer: "accepted-total",
      explanation: `Only values at least ${threshold} are added. Those values are ${threshold + 1} and ${threshold + 4}, so total becomes ${acceptedTotal}. The loop visits array elements by value because i32 is Copy.`,
      impact: "No bug is shown. This is ordinary control flow, but security review often starts with the same exercise: identify exactly which inputs pass a guard and which state they change.",
      auditorTakeaway: "Trace the predicate first, then update the accumulator only for values that pass it.",
      findingClass: "language-behavior",
    });
  },
};

export const retainPendingJobsTemplate: ChallengeTemplate = {
  id: "reading.retain-pending-jobs.v1",
  track: TRACK,
  concepts: ["code-reading", "vectors", "closures", "in-place-mutation"],
  minDifficulty: 0.75,
  maxDifficulty: 1.95,
  generate(rng, targetDifficulty) {
    const item = rng.pick(["Job", "Task", "Delivery"]);
    const collection = rng.pick(["jobs", "tasks", "queue"]);
    const functionName = rng.pick(["keep_retryable", "prune_queue", "retain_pending"]);

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Prune a retry queue",
      code: code([
        `struct ${item} {`,
        `    attempts: u8,`,
        `    done: bool,`,
        `}`,
        ``,
        `fn ${functionName}(${collection}: &mut Vec<${item}>, limit: u8) {`,
        `    ${collection}.retain(|item| {`,
        `        !item.done && item.attempts < limit`,
        `    });`,
        `}`,
      ]),
      question: `What does ${functionName} do?`,
      interactionType: "code-comprehension",
      answers: [
        {
          id: "keep-retryable",
          label: "Removes completed or exhausted items in place and preserves the others' order",
        },
        {
          id: "keep-finished",
          label: "Keeps only completed items whose attempt count reached the limit",
        },
        {
          id: "stop-first",
          label: "Stops at the first completed item and leaves the rest of the vector unchanged",
        },
        {
          id: "new-vector",
          label: "Builds and returns a new filtered vector without changing the input",
        },
      ],
      correctAnswer: "keep-retryable",
      explanation: `Vec::retain keeps each element for which the closure returns true. This closure keeps an item only when it is unfinished and has fewer than limit attempts. The vector is changed in place, and retained items keep their original order.`,
      impact: "No bug is shown. In real retry logic, reversing a retain predicate can silently discard live work or repeatedly process jobs that should be retired.",
      auditorTakeaway: "Read retain predicates as keep conditions, not remove conditions.",
      findingClass: "language-behavior",
    });
  },
};

export const normalizedNameOutputTemplate: ChallengeTemplate = {
  id: "reading.output-normalized-name.v1",
  track: TRACK,
  concepts: ["code-reading", "output-prediction", "strings", "mutable-references"],
  minDifficulty: 0.9,
  maxDifficulty: 2.15,
  generate(rng, targetDifficulty) {
    const functionName = rng.pick(["normalize", "normalize_name", "rust_filename"]);
    const variable = rng.pick(["name", "path", "module"]);
    const input = rng.pick(["AuditLog", "Packet", "MainFile", "Report"]);
    const lowercase = input.toLowerCase();
    const normalized = `${lowercase}.rs`;

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Normalize a Rust filename",
      code: code([
        `fn ${functionName}(value: &mut String) {`,
        `    value.make_ascii_lowercase();`,
        `    if !value.ends_with(".rs") {`,
        `        value.push_str(".rs");`,
        `    }`,
        `}`,
        ``,
        `fn main() {`,
        `    let mut ${variable} = String::from("${input}");`,
        `    ${functionName}(&mut ${variable});`,
        `    println!("{${variable}}");`,
        `}`,
      ]),
      question: "What does this program print?",
      interactionType: "output-prediction",
      answers: [
        { id: "normalized", label: normalized },
        { id: "original", label: input },
        { id: "lowercase-only", label: lowercase },
        { id: "extension-only", label: `${input}.rs` },
      ],
      correctAnswer: "normalized",
      explanation: `make_ascii_lowercase changes the String through its mutable reference, producing ${lowercase}. Because that value does not end in .rs, push_str appends the extension. The final output is ${normalized}.`,
      impact: "No bug is shown. Normalization order matters in practical validation: comparisons made before and after canonicalization can otherwise disagree.",
      auditorTakeaway: "For &mut inputs, trace mutations in order; later conditions see the already-modified value.",
      findingClass: "language-behavior",
    });
  },
};

export const parseConfigEntryTemplate: ChallengeTemplate = {
  id: "reading.parse-config-entry.v1",
  track: TRACK,
  concepts: ["code-reading", "parsing", "option-result", "question-mark"],
  minDifficulty: 1.35,
  maxDifficulty: 2.85,
  generate(rng, targetDifficulty) {
    const functionName = rng.pick(["parse_limit", "parse_setting", "parse_entry"]);
    const left = rng.pick(["name", "key", "field"]);
    const right = rng.pick(["raw", "value_text", "encoded"]);

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Parse one configuration entry",
      code: code([
        `fn ${functionName}(line: &str) -> Option<(&str, u16)> {`,
        `    let (${left}, ${right}) = line.split_once('=')?;`,
        `    let ${left} = ${left}.trim();`,
        `    if ${left}.is_empty() { return None; }`,
        ``,
        `    let value = ${right}.trim().parse::<u16>().ok()?;`,
        `    Some((${left}, value))`,
        `}`,
      ]),
      question: `Which description of ${functionName} is accurate?`,
      interactionType: "code-comprehension",
      answers: [
        {
          id: "validated-pair",
          label: "Splits at the first =, trims both sides, and returns a nonempty name with a valid u16",
        },
        {
          id: "last-unchecked",
          label: "Splits at the last = and returns both sides without validating the number",
        },
        {
          id: "defaults",
          label: "Returns an empty name and zero whenever the separator or number is missing",
        },
        {
          id: "panics",
          label: "Panics when = is absent or the right side is not a u16",
        },
      ],
      correctAnswer: "validated-pair",
      explanation: "split_once uses the first = and returns None when it is absent. The function trims the name and rejects an empty one. parse checks the trimmed right side as u16; ok()? converts a parse error into an early None.",
      impact: "No bug is shown. This pattern makes malformed input explicit, but an auditor should still ask whether first-separator semantics and whitespace normalization match the file format's canonical rules.",
      auditorTakeaway: "Expand every ? into its early-return branch when tracing a parser.",
      findingClass: "language-behavior",
    });
  },
};

export const validPortsOutputTemplate: ChallengeTemplate = {
  id: "reading.output-valid-ports.v1",
  track: TRACK,
  concepts: ["code-reading", "output-prediction", "iterators", "parsing"],
  minDifficulty: 1.75,
  maxDifficulty: 3.25,
  generate(rng, targetDifficulty) {
    const privilegedCount = rng.int(1, 3);
    const lowPorts = rng.shuffle([53, 80, 443, 808]).slice(0, privilegedCount);
    const highPort = rng.pick([2048, 3000, 8080]);
    const invalid = rng.pick(["bad", "none", "?"]);
    const entries = rng.shuffle([
      ...lowPorts.map(String),
      String(highPort),
      invalid,
    ]);

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Count parsed system ports",
      code: code([
        `fn main() {`,
        `    let ports = [${entries.map((entry) => `"${entry}"`).join(", ")}];`,
        `    let privileged = ports`,
        `        .iter()`,
        `        .copied()`,
        `        .filter_map(|text| text.parse::<u16>().ok())`,
        `        .filter(|port| *port < 1024)`,
        `        .count();`,
        ``,
        `    println!("{privileged}");`,
        `}`,
      ]),
      question: "What does this program print?",
      interactionType: "output-prediction",
      answers: [
        { id: "privileged-count", label: String(privilegedCount) },
        { id: "valid-count", label: String(privilegedCount + 1) },
        { id: "entry-count", label: String(privilegedCount + 2) },
        { id: "panic", label: "Nothing; parsing the invalid entry panics" },
      ],
      correctAnswer: "privileged-count",
      explanation: `filter_map discards ${invalid} because parsing returns Err, while the numeric entries continue as u16 values. The second filter keeps only ports below 1024, leaving ${privilegedCount} value${privilegedCount === 1 ? "" : "s"}.`,
      impact: "No bug is shown. The pipeline deliberately ignores malformed entries; in a security-sensitive parser, silently dropping them may or may not be the intended policy.",
      auditorTakeaway: "For iterator pipelines, write down the item type and surviving values after every adapter.",
      findingClass: "language-behavior",
    });
  },
};

export const countNormalizedTagsTemplate: ChallengeTemplate = {
  id: "reading.count-normalized-tags.v1",
  track: TRACK,
  concepts: ["code-reading", "hashmap", "normalization", "ownership"],
  minDifficulty: 2.15,
  maxDifficulty: 3.65,
  generate(rng, targetDifficulty) {
    const functionName = rng.pick(["count_tags", "tag_frequencies", "count_labels"]);
    const parameter = rng.pick(["tags", "labels", "events"]);

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Count normalized labels",
      code: code([
        `use std::collections::HashMap;`,
        ``,
        `fn ${functionName}(${parameter}: &[&str])`,
        `    -> HashMap<String, usize>`,
        `{`,
        `    let mut counts = HashMap::new();`,
        `    for &label in ${parameter} {`,
        `        let key = label.to_ascii_lowercase();`,
        `        *counts.entry(key).or_insert(0) += 1;`,
        `    }`,
        `    counts`,
        `}`,
      ]),
      question: `What does ${functionName} return?`,
      interactionType: "code-comprehension",
      answers: [
        {
          id: "normalized-counts",
          label: "An owned map of ASCII-lowercased labels to their occurrence counts",
        },
        {
          id: "first-only",
          label: "A lowercased map where duplicate labels are ignored after their first occurrence",
        },
        {
          id: "last-position",
          label: "A case-sensitive map from each label to the position where it last appeared",
        },
        {
          id: "borrowed-keys",
          label: "A map whose keys borrow directly from the input slice and cannot outlive it",
        },
      ],
      correctAnswer: "normalized-counts",
      explanation: "to_ascii_lowercase creates an owned String key. entry finds or inserts that normalized key, and the dereferenced count is incremented for every occurrence. Labels that differ only by ASCII case share one counter.",
      impact: "No bug is shown. Normalizing before aggregation is common, but auditors should verify that ASCII-only case folding matches the identifier policy and cannot create unwanted collisions.",
      auditorTakeaway: "With HashMap::entry, identify the owned key first, then trace whether existing and vacant entries take the same update.",
      findingClass: "language-behavior",
    });
  },
};

export const clonedSortOutputTemplate: ChallengeTemplate = {
  id: "reading.output-cloned-sort.v1",
  track: TRACK,
  concepts: ["code-reading", "output-prediction", "ownership", "clone"],
  minDifficulty: 2.65,
  maxDifficulty: 4.15,
  generate(rng, targetDifficulty) {
    const base = rng.int(2, 12);
    const original = [base + 5, base, base + 2];
    const ordered = [...original].sort((left, right) => left - right);
    const originalText = `[${original.join(", ")}]`;
    const orderedText = `[${ordered.join(", ")}]`;
    const functionName = rng.pick(["sorted_copy", "sort_snapshot", "sorted_values"]);

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Sort a cloned snapshot",
      code: code([
        `fn ${functionName}(mut values: Vec<i32>) -> Vec<i32> {`,
        `    values.sort();`,
        `    values`,
        `}`,
        ``,
        `fn main() {`,
        `    let original = vec![${original.join(", ")}];`,
        `    let ordered = ${functionName}(original.clone());`,
        `    println!("{original:?} -> {ordered:?}");`,
        `}`,
      ]),
      question: "What does the println! line print?",
      interactionType: "output-prediction",
      answers: [
        { id: "independent", label: `${originalText} -> ${orderedText}` },
        { id: "both-sorted", label: `${orderedText} -> ${orderedText}` },
        { id: "both-original", label: `${originalText} -> ${originalText}` },
        { id: "moved", label: "Compiler error: original was moved into the function" },
      ],
      correctAnswer: "independent",
      explanation: `clone creates a separate Vec with the same elements. ${functionName} takes ownership of that clone and sorts it, while original remains unchanged and usable. Debug formatting therefore prints ${originalText} followed by ${orderedText}.`,
      impact: "No bug is shown. In production code, cloning can intentionally isolate mutation, but an auditor should notice its memory and CPU cost when collections are attacker-sized.",
      auditorTakeaway: "When clone appears before a move, track the original and clone as independent owners from that point onward.",
      findingClass: "language-behavior",
    });
  },
};

export const dropScopesOutputTemplate: ChallengeTemplate = {
  id: "reading.output-drop-scopes.v1",
  track: TRACK,
  concepts: ["code-reading", "output-prediction", "drop-semantics", "raii"],
  minDifficulty: 3.55,
  maxDifficulty: 5.25,
  generate(rng, targetDifficulty) {
    const outer = rng.pick(["session", "socket", "database"]);
    const inner = rng.pick(["file", "transaction", "buffer"]);

    return singleChallenge(rng, {
      templateId: this.id,
      track: TRACK,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Watch the guards leave scope",
      code: code([
        `struct Guard(&'static str);`,
        ``,
        `impl Drop for Guard {`,
        `    fn drop(&mut self) {`,
        `        println!("close {}", self.0);`,
        `    }`,
        `}`,
        ``,
        `fn main() {`,
        `    let _outer = Guard("${outer}");`,
        `    {`,
        `        let _inner = Guard("${inner}");`,
        `        println!("work");`,
        `    }`,
        `    println!("done");`,
        `}`,
      ]),
      question: "Which line sequence is printed?",
      interactionType: "output-prediction",
      answers: [
        {
          id: "scoped-drop",
          label: `work → close ${inner} → done → close ${outer}`,
        },
        {
          id: "function-end",
          label: `work → done → close ${inner} → close ${outer}`,
        },
        {
          id: "outer-first",
          label: `work → close ${outer} → done → close ${inner}`,
        },
        {
          id: "unused-elided",
          label: "work → done",
        },
      ],
      correctAnswer: "scoped-drop",
      explanation: `The inner Guard is dropped when its block ends, immediately after work. Execution then prints done. The outer Guard remains alive until main ends, so close ${outer} is last. Leading underscores suppress unused warnings; they do not skip Drop.`,
      impact: "No bug is shown. RAII cleanup timing matters for locks, temporary files, transactions, and other guards; a value that stays in scope longer than expected can hold a resource longer too.",
      auditorTakeaway: "Mark lexical scope boundaries before predicting when guards and other Drop types release resources.",
      findingClass: "language-behavior",
    });
  },
};

export const practicalReadingTemplates: readonly ChallengeTemplate[] = [
  filteredTotalOutputTemplate,
  retainPendingJobsTemplate,
  normalizedNameOutputTemplate,
  parseConfigEntryTemplate,
  validPortsOutputTemplate,
  countNormalizedTagsTemplate,
  clonedSortOutputTemplate,
  dropScopesOutputTemplate,
] as const;
