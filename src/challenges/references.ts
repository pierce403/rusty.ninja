export interface OfficialReference {
  readonly source: string;
  readonly title: string;
  readonly url: string;
}

const reference = (
  source: string,
  title: string,
  url: string,
): OfficialReference => ({ source, title, url });

const REFERENCES_BY_TEMPLATE: Readonly<Record<string, readonly OfficialReference[]>> = {
  "syntax.let-shadowing.v1": [
    reference(
      "The Rust Book",
      "Variables, mutability, and shadowing",
      "https://doc.rust-lang.org/book/ch03-01-variables-and-mutability.html#shadowing",
    ),
  ],
  "syntax.shared-reference.v1": [
    reference(
      "The Rust Book",
      "References and borrowing",
      "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html",
    ),
  ],
  "syntax.mutable-reference.v1": [
    reference(
      "The Rust Book",
      "Mutable references and exclusivity",
      "https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html#mutable-references",
    ),
  ],
  "syntax.slice-view.v1": [
    reference(
      "The Rust Book",
      "The slice type",
      "https://doc.rust-lang.org/book/ch04-03-slices.html",
    ),
  ],
  "syntax.question-mark.v1": [
    reference(
      "Rust Reference",
      "The question mark operator",
      "https://doc.rust-lang.org/reference/expressions/operator-expr.html#the-question-mark-operator",
    ),
    reference(
      "Rust standard library",
      "Result",
      "https://doc.rust-lang.org/std/result/enum.Result.html",
    ),
    reference(
      "Rust standard library",
      "Option",
      "https://doc.rust-lang.org/std/option/enum.Option.html",
    ),
  ],
  "syntax.explicit-lifetime.v1": [
    reference(
      "The Rust Book",
      "Lifetime annotation syntax",
      "https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html#lifetime-annotation-syntax",
    ),
  ],
  "reading.output-filtered-total.v1": [
    reference(
      "The Rust Book",
      "Looping through a collection with for",
      "https://doc.rust-lang.org/book/ch03-05-control-flow.html#looping-through-a-collection-with-for",
    ),
  ],
  "reading.retain-pending-jobs.v1": [
    reference(
      "Rust standard library",
      "Vec::retain",
      "https://doc.rust-lang.org/std/vec/struct.Vec.html#method.retain",
    ),
  ],
  "reading.output-normalized-name.v1": [
    reference(
      "Rust standard library",
      "str::make_ascii_lowercase",
      "https://doc.rust-lang.org/std/primitive.str.html#method.make_ascii_lowercase",
    ),
    reference(
      "Rust standard library",
      "String::push_str",
      "https://doc.rust-lang.org/std/string/struct.String.html#method.push_str",
    ),
  ],
  "reading.parse-config-entry.v1": [
    reference(
      "Rust standard library",
      "str::split_once",
      "https://doc.rust-lang.org/std/primitive.str.html#method.split_once",
    ),
    reference(
      "Rust standard library",
      "Result::ok",
      "https://doc.rust-lang.org/std/result/enum.Result.html#method.ok",
    ),
    reference(
      "Rust Reference",
      "The question mark operator",
      "https://doc.rust-lang.org/reference/expressions/operator-expr.html#the-question-mark-operator",
    ),
  ],
  "reading.output-valid-ports.v1": [
    reference(
      "Rust standard library",
      "Iterator::filter_map",
      "https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.filter_map",
    ),
    reference(
      "Rust standard library",
      "str::parse",
      "https://doc.rust-lang.org/std/primitive.str.html#method.parse",
    ),
  ],
  "reading.count-normalized-tags.v1": [
    reference(
      "Rust standard library",
      "HashMap::entry",
      "https://doc.rust-lang.org/std/collections/hash_map/struct.HashMap.html#method.entry",
    ),
    reference(
      "Rust standard library",
      "Entry::or_insert",
      "https://doc.rust-lang.org/std/collections/hash_map/enum.Entry.html#method.or_insert",
    ),
  ],
  "reading.output-cloned-sort.v1": [
    reference(
      "Rust standard library",
      "Clone",
      "https://doc.rust-lang.org/std/clone/trait.Clone.html",
    ),
    reference(
      "Rust standard library",
      "Slice::sort",
      "https://doc.rust-lang.org/std/primitive.slice.html#method.sort",
    ),
  ],
  "reading.output-drop-scopes.v1": [
    reference(
      "Rust standard library",
      "Drop",
      "https://doc.rust-lang.org/std/ops/trait.Drop.html",
    ),
    reference(
      "Rust Reference",
      "Drop scopes",
      "https://doc.rust-lang.org/reference/destructors.html#drop-scopes",
    ),
  ],
  "ownership.move-after-move.v1": [
    reference(
      "The Rust Book",
      "Variables and data interacting with move",
      "https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html#variables-and-data-interacting-with-move",
    ),
  ],
  "foundations.boundary-index.v1": [
    reference(
      "Rust standard library",
      "Slice::get bounds-checked access",
      "https://doc.rust-lang.org/std/primitive.slice.html#method.get",
    ),
  ],
  "foundations.refcell-reentrancy.v1": [
    reference(
      "Rust standard library",
      "RefCell::borrow_mut runtime borrowing rules",
      "https://doc.rust-lang.org/std/cell/struct.RefCell.html#method.borrow_mut",
    ),
  ],
  "integers.narrowing-length.v1": [
    reference(
      "Rust Reference",
      "Type-cast expression semantics",
      "https://doc.rust-lang.org/reference/expressions/operator-expr.html#type-cast-expressions",
    ),
    reference(
      "Rust standard library",
      "TryFrom checked conversions",
      "https://doc.rust-lang.org/std/convert/trait.TryFrom.html",
    ),
  ],
  "integers.checked-range.v1": [
    reference(
      "Rust standard library",
      "usize::checked_add",
      "https://doc.rust-lang.org/std/primitive.usize.html#method.checked_add",
    ),
    reference(
      "Rust standard library",
      "Slice::get bounds-checked ranges",
      "https://doc.rust-lang.org/std/primitive.slice.html#method.get",
    ),
  ],
  "integers.signed-allocation.v1": [
    reference(
      "Rust Reference",
      "Numeric cast semantics",
      "https://doc.rust-lang.org/reference/expressions/operator-expr.html#numeric-cast",
    ),
    reference(
      "Rust standard library",
      "Vec::try_reserve fallible allocation",
      "https://doc.rust-lang.org/std/vec/struct.Vec.html#method.try_reserve",
    ),
  ],
  "parsing.allocate-before-validate.v1": [
    reference(
      "Rust standard library",
      "Vec::try_reserve_exact",
      "https://doc.rust-lang.org/std/vec/struct.Vec.html#method.try_reserve_exact",
    ),
    reference(
      "Rust standard library",
      "Read::read_exact",
      "https://doc.rust-lang.org/std/io/trait.Read.html#method.read_exact",
    ),
  ],
  "parsing.serde-default-privilege.v1": [
    reference(
      "Serde",
      "#[serde(default)] field behavior",
      "https://serde.rs/field-attrs.html#serde-default",
    ),
    reference(
      "Rust standard library",
      "Default trait",
      "https://doc.rust-lang.org/std/default/trait.Default.html",
    ),
  ],
  "parsing.untagged-first-match.v1": [
    reference(
      "Serde",
      "#[serde(untagged)] container behavior",
      "https://serde.rs/container-attrs.html#serde-untagged",
    ),
  ],
  "parsing.lexical-path-containment.v1": [
    reference(
      "Rust standard library",
      "Path manipulation and canonicalization",
      "https://doc.rust-lang.org/std/path/index.html",
    ),
  ],
  "parsing.split-signature-stream.v1": [
    reference(
      "serde_json",
      "Deserializer and end-of-input checking",
      "https://docs.rs/serde_json/latest/serde_json/struct.Deserializer.html#method.end",
    ),
    reference(
      "serde_json",
      "StreamDeserializer byte offsets and framing",
      "https://docs.rs/serde_json/latest/serde_json/struct.StreamDeserializer.html",
    ),
  ],
  "concurrency.mutex-await-reentrance.v1": [
    reference(
      "Tokio",
      "Async Mutex behavior and guard lifetime",
      "https://docs.rs/tokio/latest/tokio/sync/struct.Mutex.html",
    ),
  ],
  "concurrency.atomic-publication.v1": [
    reference(
      "Rust standard library",
      "Atomic Ordering: Relaxed, Release, and Acquire",
      "https://doc.rust-lang.org/std/sync/atomic/enum.Ordering.html",
    ),
  ],
  "concurrency.cancelled-read-exact.v1": [
    reference(
      "Tokio",
      "AsyncReadExt::read_exact cancellation safety",
      "https://docs.rs/tokio/latest/tokio/io/trait.AsyncReadExt.html#method.read_exact",
    ),
    reference(
      "Tokio",
      "select! cancellation safety",
      "https://docs.rs/tokio/latest/tokio/macro.select.html#cancellation-safety",
    ),
  ],
  "unsafe.raw-slice-contract.v1": [
    reference(
      "Rust standard library",
      "slice::from_raw_parts safety requirements",
      "https://doc.rust-lang.org/std/slice/fn.from_raw_parts.html#safety",
    ),
  ],
  "unsafe.unchecked-off-by-one.v1": [
    reference(
      "Rust standard library",
      "Slice::get_unchecked safety requirements",
      "https://doc.rust-lang.org/std/primitive.slice.html#method.get_unchecked",
    ),
  ],
  "unsafe.vec-from-raw-parts.v1": [
    reference(
      "Rust standard library",
      "Vec::from_raw_parts safety requirements",
      "https://doc.rust-lang.org/std/vec/struct.Vec.html#method.from_raw_parts",
    ),
  ],
  "unsafe.invalid-bool-transmute.v1": [
    reference(
      "Rust Reference",
      "bool layout and valid bit patterns",
      "https://doc.rust-lang.org/reference/types/boolean.html#r-type.bool.repr",
    ),
    reference(
      "Rust standard library",
      "mem::transmute safety",
      "https://doc.rust-lang.org/std/mem/fn.transmute.html",
    ),
  ],
  "unsafe.maybeuninit-header.v1": [
    reference(
      "Rust standard library",
      "MaybeUninit initialization invariants",
      "https://doc.rust-lang.org/std/mem/union.MaybeUninit.html#initialization-invariant",
    ),
    reference(
      "Rust Reference",
      "Invalid and uninitialized values",
      "https://doc.rust-lang.org/reference/behavior-considered-undefined.html#invalid-values",
    ),
  ],
  "ffi.cstring-ownership.v1": [
    reference(
      "Rust standard library",
      "CString::from_raw ownership contract",
      "https://doc.rust-lang.org/std/ffi/struct.CString.html#method.from_raw",
    ),
    reference(
      "Rust standard library",
      "CStr::from_ptr safety contract",
      "https://doc.rust-lang.org/std/ffi/struct.CStr.html#method.from_ptr",
    ),
    reference(
      "Rust Reference",
      "Unwinding across FFI boundaries",
      "https://doc.rust-lang.org/reference/panic.html#unwinding-across-ffi-boundaries",
    ),
  ],
  "ffi.callback-lifetime.v1": [
    reference(
      "Rustonomicon",
      "Asynchronous callbacks across FFI",
      "https://doc.rust-lang.org/nomicon/ffi.html#asynchronous-callbacks",
    ),
    reference(
      "Rust Reference",
      "Dangling pointers and invalid references",
      "https://doc.rust-lang.org/reference/behavior-considered-undefined.html#dangling-pointers",
    ),
  ],
  "soundness.two-mutable-references.v1": [
    reference(
      "Rust standard library",
      "Slice::split_at_mut for disjoint mutable borrows",
      "https://doc.rust-lang.org/std/primitive.slice.html#method.split_at_mut",
    ),
    reference(
      "Rust Reference",
      "Aliasing rules for references",
      "https://doc.rust-lang.org/reference/behavior-considered-undefined.html#aliasing",
    ),
  ],
  "soundness.invalid-send.v1": [
    reference(
      "Rustonomicon",
      "Send and Sync contracts",
      "https://doc.rust-lang.org/nomicon/send-and-sync.html",
    ),
  ],
  "soundness.pre-pin-self-reference.v1": [
    reference(
      "Rust standard library",
      "Pinning and address-sensitive values",
      "https://doc.rust-lang.org/std/pin/index.html#address-sensitive-values-aka-when-we-need-pinning",
    ),
  ],
  "soundness.missing-phantomdata.v1": [
    reference(
      "Rust standard library",
      "PhantomData ownership and lifetime relationships",
      "https://doc.rust-lang.org/std/marker/struct.PhantomData.html",
    ),
    reference(
      "Rustonomicon",
      "PhantomData patterns and variance",
      "https://doc.rust-lang.org/nomicon/phantom-data.html",
    ),
  ],
  "soundness.deserialized-invariant.v1": [
    reference(
      "Serde",
      "Derived deserialization",
      "https://serde.rs/derive.html",
    ),
    reference(
      "Rust standard library",
      "Slice::get_unchecked safety requirements",
      "https://doc.rust-lang.org/std/primitive.slice.html#method.get_unchecked",
    ),
    reference(
      "Rust standard library",
      "usize::checked_add",
      "https://doc.rust-lang.org/std/primitive.usize.html#method.checked_add",
    ),
  ],
};

const NO_REFERENCES: readonly OfficialReference[] = [];

export function getOfficialReferences(
  templateId: string,
): readonly OfficialReference[] {
  return REFERENCES_BY_TEMPLATE[templateId] ?? NO_REFERENCES;
}

export function getOfficialReferencesForFeedback(
  templateId: string,
  correct: boolean,
): readonly OfficialReference[] {
  return correct ? NO_REFERENCES : getOfficialReferences(templateId);
}
