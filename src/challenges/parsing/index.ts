import type { ChallengeTemplate } from "../../game/types";
import { boundedDifficulty, code, multiChallenge, singleChallenge } from "../shared";

export const allocationBeforeValidationTemplate: ChallengeTemplate = {
  id: "parsing.allocate-before-validate.v1",
  concepts: ["length-prefixes", "allocation", "resource-exhaustion", "parsing"],
  minDifficulty: 3.4,
  maxDifficulty: 5.9,
  generate(rng, targetDifficulty) {
    const max = rng.pick([4096, 16_384, 65_536]);
    const length = rng.pick(["declared", "wire_len", "payload_len"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Reserve first, validate later",
      code: code([
        `fn read_blob<R: Read>(r: &mut R) -> io::Result<Vec<u8>> {`,
        `    let ${length} = r.read_u64::<BigEndian>()?;`,
        `    let mut body = Vec::with_capacity(${length} as usize);`,
        ``,
        `    if ${length} > ${max} {`,
        `        return Err(invalid_data("blob too large"));`,
        `    }`,
        `    r.take(${length}).read_to_end(&mut body)?;`,
        `    Ok(body)`,
        `}`,
      ]),
      question: "What is the earliest attacker-controlled failure?",
      interactionType: "dangerous-line",
      answers: [
        { id: "read", label: `Line 2 — reading ${length}` },
        { id: "reserve", label: "Line 3 — reserving before applying the limit" },
        { id: "limit", label: "Line 5 — comparing values of different sizes" },
        { id: "take", label: "Line 8 — take performs unchecked pointer arithmetic" },
      ],
      correctAnswer: "reserve",
      explanation: `The parser attempts the allocation before enforcing the ${max}-byte policy. On 64-bit targets, a huge u64 can trigger a capacity panic or allocation failure; on narrower targets, the as cast also truncates.`,
      impact: "A tiny input containing only a malicious length prefix can consume resources or terminate processing before the intended size check. Separately, read_to_end on take accepts early EOF, so the original function can also return fewer bytes than declared.",
      fixedCode: code([
        `let ${length} = r.read_u64::<BigEndian>()?;`,
        `if ${length} > ${max} { return Err(invalid_data("blob too large")); }`,
        `let len = usize::try_from(${length})`,
        `    .map_err(|_| invalid_data("length does not fit"))?;`,
        `let mut body = Vec::new();`,
        `body.try_reserve_exact(len).map_err(|_| invalid_data("capacity"))?;`,
        `body.resize(len, 0);`,
        `r.read_exact(&mut body)?;`,
        `Ok(body)`,
      ]),
      auditorTakeaway: "Apply protocol limits and fallible conversions before any reservation or recursion.",
      findingClass: "panic-dos",
    });
  },
};

export const serdeDefaultPrivilegeTemplate: ChallengeTemplate = {
  id: "parsing.serde-default-privilege.v1",
  concepts: ["serde-defaults", "authorization", "insecure-defaults", "validation"],
  minDifficulty: 4.1,
  maxDifficulty: 6.4,
  generate(rng, targetDifficulty) {
    const privileged = rng.pick(["Admin", "Operator", "Maintainer"]);
    const ordinary = rng.pick(["Reader", "Guest", "User"]);
    const subject = rng.pick(["Claims", "Session", "Grant"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Default means privileged",
      code: code([
        `#[derive(Deserialize, Default)]`,
        `enum Role {`,
        `    #[default]`,
        `    ${privileged},`,
        `    ${ordinary},`,
        `}`,
        ``,
        `#[derive(Deserialize)]`,
        `struct ${subject} {`,
        `    user: String,`,
        `    #[serde(default)]`,
        `    role: Role,`,
        `}`,
      ]),
      question: "What does JSON containing only the user field produce?",
      interactionType: "multiple-choice",
      answers: [
        { id: "privileged", label: `A valid ${subject} with role ${privileged}` },
        { id: "ordinary", label: `A valid ${subject} with role ${ordinary}` },
        { id: "reject", label: "A missing-field deserialization error" },
        { id: "compile", label: "A compiler error because enums cannot be Default" },
      ],
      correctAnswer: "privileged",
      explanation: `#[serde(default)] uses Role::default when role is absent, and the derive marks ${privileged} as that default. Deserialization therefore manufactures a privileged role for an omitted field.`,
      impact: "If this deserialized role is trusted for authorization, omitting one JSON field becomes a privilege escalation. This is safe Rust with a security-critical logic bug.",
      fixedCode: code([
        `#[derive(Deserialize)]`,
        `struct ${subject} {`,
        `    user: String,`,
        `    role: Role, // required on the wire`,
        `}`,
      ]),
      auditorTakeaway: "Audit defaults as input: ask what authority an omitted field receives.",
      findingClass: "security",
    });
  },
};

export const untaggedVariantTemplate: ChallengeTemplate = {
  id: "parsing.untagged-first-match.v1",
  concepts: ["serde-untagged", "ambiguous-encoding", "authorization", "parser-order"],
  minDifficulty: 5.4,
  maxDifficulty: 7.5,
  generate(rng, targetDifficulty) {
    const key = rng.pick(["resource", "project", "document"]);
    const privileged = rng.pick(["Admin", "Owner", "Operator"]);
    const regular = rng.pick(["Viewer", "Member", "Guest"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "First matching variant wins",
      code: code([
        `#[derive(Deserialize)]`,
        `#[serde(untagged)]`,
        `enum Access {`,
        `    ${privileged} { ${key}: String },`,
        `    ${regular} { ${key}: String },`,
        `}`,
        ``,
        `fn may_delete(access: &Access) -> bool {`,
        `    matches!(access, Access::${privileged} { .. })`,
        `}`,
      ]),
      question: `How is {"${key}":"rusty"} interpreted?`,
      interactionType: "multiple-choice",
      answers: [
        { id: "first", label: `As ${privileged}, because both shapes match and it appears first` },
        { id: "second", label: `As ${regular}, because it is less privileged` },
        { id: "ambiguous", label: "Rejected by Serde as ambiguous" },
        { id: "both", label: "As both variants simultaneously" },
      ],
      correctAnswer: "first",
      explanation: `For an untagged enum, Serde attempts variants in declaration order and accepts the first successful deserialization. These variants have identical wire shapes, so ${regular} is never selected for that input.`,
      impact: `If variant identity carries authority, an ordinary-looking object is classified as ${privileged}. The type is memory-safe but the wire representation is ambiguous.`,
      fixedCode: code([
        `#[derive(Deserialize)]`,
        `#[serde(tag = "kind", rename_all = "snake_case")]`,
        `enum Access {`,
        `    ${privileged} { ${key}: String },`,
        `    ${regular} { ${key}: String },`,
        `}`,
      ]),
      auditorTakeaway: "For untagged enums, compare accepted shapes—not just variant names.",
      findingClass: "security",
    });
  },
};

export const lexicalPathTemplate: ChallengeTemplate = {
  id: "parsing.lexical-path-containment.v1",
  concepts: ["path-traversal", "canonicalization", "symlinks", "toctou"],
  minDifficulty: 4.8,
  maxDifficulty: 7.4,
  generate(rng, targetDifficulty) {
    const root = rng.pick(["upload_root", "plugin_root", "archive_root"]);
    const name = rng.pick(["requested", "entry", "relative"]);

    return singleChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Lexically inside, physically outside",
      code: code([
        `fn open_beneath(${root}: &Path, ${name}: &Path)`,
        `    -> io::Result<File>`,
        `{`,
        `    let candidate = ${root}.join(${name});`,
        `    if !candidate.starts_with(${root}) {`,
        `        return Err(denied());`,
        `    }`,
        `    File::open(candidate)`,
        `}`,
      ]),
      question: "What additional context should you inspect before approving a patch that only calls canonicalize?",
      interactionType: "inspect-next",
      answers: [
        { id: "resolution", label: "Symlink policy and whether the final open is handle-relative/no-follow" },
        { id: "hash", label: "Whether Path implements a constant-time Hash" },
        { id: "utf8", label: "Whether every filename is valid UTF-8" },
        { id: "allocator", label: "Which allocator PathBuf uses" },
      ],
      correctAnswer: "resolution",
      explanation: "Path::starts_with compares path components lexically; it does not resolve .. or symlinks. Canonicalizing and then opening by pathname can still leave a check/use race if an attacker can swap links or directories.",
      impact: "Under attacker-controlled filesystem state, the code may read files outside the intended root. Severity depends on platform, privileges, writable directories, and how the returned file is used.",
      fixedCode: code([
        `// Prefer a capability rooted at an already-open directory.`,
        `// On supported platforms, resolve each component beneath it`,
        `// with no-follow / beneath constraints and open the final handle`,
        `// without returning to an attacker-mutable pathname.`,
      ]),
      auditorTakeaway: "Path containment is an OS resolution problem, not a string-prefix problem.",
      findingClass: "security",
    });
  },
};

export const splitSignatureTemplate: ChallengeTemplate = {
  id: "parsing.split-signature-stream.v1",
  concepts: ["partial-consumption", "trailing-data", "signatures", "parser-differential"],
  minDifficulty: 7.2,
  maxDifficulty: 9.1,
  generate(rng, targetDifficulty) {
    const object = rng.pick(["Command", "Manifest", "Policy"]);

    return multiChallenge(rng, {
      templateId: this.id,
      difficulty: boundedDifficulty(targetDifficulty, this.minDifficulty, this.maxDifficulty, rng),
      concepts: this.concepts,
      title: "Verified one value, executed the next",
      code: code([
        `fn decode(bytes: &[u8], key: &Key) -> Result<${object}, Error> {`,
        `    let mut de = serde_json::Deserializer::from_slice(bytes);`,
        `    let signed = Signed::<${object}>::deserialize(&mut de)?;`,
        `    key.verify(&signed.payload, &signed.signature)?;`,
        ``,
        `    // Read the command that the caller will execute.`,
        `    let command = ${object}::deserialize(&mut de)?;`,
        `    Ok(command)`,
        `}`,
      ]),
      question: "Select every security-relevant issue in the shown design.",
      interactionType: "find-all",
      answers: [
        { id: "bind", label: "The returned object is not the exact payload whose signature was verified" },
        { id: "trailing", label: "No end-of-input check rejects data after the returned command" },
        { id: "memory", label: "Creating two Serde values necessarily aliases mutable memory" },
        { id: "utf8", label: "JSON permits invalid UTF-8 strings" },
        { id: "stream", label: "Using a streaming deserializer is inherently unsafe" },
      ],
      correctAnswer: ["bind", "trailing"],
      explanation: "The first value is authenticated, but a distinct second value is returned. An attacker can pair a valid signed benign payload with an unsigned dangerous command. The function also never requires end-of-input after that command, so further data is silently left for any downstream consumer. Streaming is not itself wrong; the value-to-signature binding and framing rules are.",
      impact: "This is a direct authentication/authorization bypass if callers execute the returned object as authenticated.",
      fixedCode: code([
        `let signed: Signed<${object}> = serde_json::from_slice(bytes)?;`,
        `key.verify(&signed.payload, &signed.signature)?;`,
        `Ok(signed.payload)`,
      ]),
      auditorTakeaway: "Track the exact bytes and exact value covered by each verification decision.",
      findingClass: "security",
    });
  },
};
