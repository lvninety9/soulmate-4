# Obsidian context design proposal

Status: proposal; no vault, application, or production data is changed by this document.

## Verified platform facts

- Obsidian Canvas is a built-in core plugin. A `.canvas` file uses the open JSON Canvas format.
  [Obsidian Canvas](https://obsidian.md/help/Plugins/Canvas) · [Core plugins](https://obsidian.md/help/Plugins/Core+plugins)
- JSON Canvas has `nodes` and `edges`. Nodes are `text`, `file`, `link`, or `group`; each has a
  stable unique ID and pixel bounds. File nodes can target a vault-relative file and `#heading` or
  `#^block` subpath. Edges can be directed and labelled. Groups are visual rectangles, not an
  explicit child-membership model. [JSON Canvas 1.0](https://github.com/obsidianmd/jsoncanvas/blob/main/spec/1.0.md)
- A Canvas text card may contain Markdown, but text-only cards do not appear in Backlinks. Backlinks
  are internal links from one note to another. Canvas edges must therefore not be treated as the
  canonical link graph. [Canvas](https://obsidian.md/help/Plugins/Canvas) · [Backlinks](https://obsidian.md/help/Plugins/Backlinks)
- Markdown properties are YAML at the top of a note and support small structured values. Obsidian
  does not support nested properties or bulk property editing natively. [Properties](https://obsidian.md/help/Editing%2Band%2Bformatting/Properties)
- Markdown links can target headings and blocks; Obsidian-specific block references are not portable
  Markdown. [Internal links](https://obsidian.md/help/Linking%2Bnotes%2Band%2Bfiles/Internal%2Blinks)

## Proposal: one canonical knowledge path

Canonical knowledge remains Markdown plus flat YAML properties. Required evidence, decisions,
tests, and unresolved alternatives live once in their relevant Markdown files. A deterministic
index reads those files; Canvas and a task-specific context manifest are derived views.

```text
Markdown + flat properties -> deterministic index -> Canvas view
                                           `-> per-task context manifest -> model input
```

The model reads neither Canvas JSON nor the whole vault. A manifest names only required note
sections, on-demand candidates, and excluded material for one task. It must be inspectable by a
human before a large task starts.

### Orthogonal fields

Use independent flat properties rather than one overloaded status:

| Concern | Suggested values | Meaning |
| --- | --- | --- |
| lifecycle | `active`, `superseded`, `example` | whether this is current guidance, replaced history, or illustration |
| verification | `fresh`, `recheck`, `unknown` | confidence and review need, not importance |
| task loading | `required`, `ondemand`, `excluded` | membership for this task's manifest only |

`required` is not global importance. A non-required reference with unique evidence may remain.
`stale` means a review candidate; `invalid` means disproven or unusable. Neither authorizes automatic
deletion. A dummy classification requires candidate evidence and human review, never absence alone.

## Derived Canvas rules

Use file cards, preferably heading/block references, to avoid copying knowledge into Canvas text
cards. Maintain three views: structural map, current task, and maintenance. Colors, groups, and edge
labels are navigation aids only; Canvas cannot natively classify lifecycle/verification or synchronize
status when a user drags a card.

Start with one-way Markdown/index -> Canvas and manifest generation. Derive stable IDs from the
canonical path/subpath/relationship so regenerated cards retain positions. Preserve manual nodes and
positions through explicit managed ownership or stored layout overrides. Never overwrite an existing
Canvas with user edits until ownership and merge behavior are explicitly implemented.

## Staleness and context sizing

Detect review candidates from source hashes/revisions, broken links, missing anchors, or changed
dependencies. File modification time alone is not proof of stale content. Keep detection separate
from judgment and deletion.

Before the next large work item or repeated test cycle, define a coherent task boundary and measure
its selected manifest. Prefer the serving model's tokenizer; report whether a count is measured or
estimated. The planning budget is 65,536 total tokens including prompt, tool, and system overhead, reserving up to 8,192 for output. Preserve headroom; do not impose arbitrary hard stops or approval
gates. Hand off before pressure when useful, allow Jay to redirect or continue, and recommend a new
session explicitly only when accumulated context warrants it--never as an automatic reset or for
every small task. Automatic documentation remains optional; manual maintenance is valid.

## Local scope and rollout experiment

The local audit found a real central vault directory with `.obsidian`, but no Canvas file within the
scoped depth and no project-to-vault integration code or configuration. Integration is therefore
unverified and is not claimed. Use the project folder as a test vault first so the same Markdown is
viewed without duplicating documents; leave the existing central vault untouched pending a separate
local inventory and a user decision.


1. Route and inventory five existing Markdown documents; define flat fields, reusable test recipes,
   runtime facts, and one task manifest so later work does not rediscover the Playwright/runtime setup.
2. From that same index, preview a generated Canvas and context manifest; make no source edits or
   deletions.
3. Run an equivalent task and compare selected input, repeated reads, compaction/length outcomes,
   and required decision/test coverage.

Acceptance evidence: no required decision or test is absent; every selected link resolves; source
documents are not edited or deleted; selected input and repeated reads are demonstrably smaller;
required decisions/tests remain covered; and the trial avoids a length failure. This is evidence of
reduced pressure, not a promise that compaction never occurs.

P1 game work remains separate and is out of scope for this proposal.
