import { describe, expect, it } from "vitest";
import {
  getOfficialReferences,
  getOfficialReferencesForFeedback,
} from "../../src/challenges/references";
import { challengeTemplates } from "../../src/challenges/registry";

const OFFICIAL_HOSTS = new Set([
  "doc.rust-lang.org",
  "docs.rs",
  "serde.rs",
]);

describe("official challenge references", () => {
  it("covers every registered template with a small relevant reading list", () => {
    for (const template of challengeTemplates) {
      const references = getOfficialReferences(template.id);
      expect(references.length, template.id).toBeGreaterThan(0);
      expect(references.length, template.id).toBeLessThanOrEqual(3);
    }
  });

  it("uses unique HTTPS links from official documentation hosts", () => {
    for (const template of challengeTemplates) {
      const references = getOfficialReferences(template.id);
      expect(new Set(references.map((reference) => reference.url)).size, template.id)
        .toBe(references.length);

      for (const reference of references) {
        const url = new URL(reference.url);
        expect(url.protocol, reference.url).toBe("https:");
        expect(OFFICIAL_HOSTS.has(url.hostname), reference.url).toBe(true);
        expect(reference.source.trim(), template.id).not.toBe("");
        expect(reference.title.trim(), template.id).not.toBe("");
      }
    }
  });

  it("returns no links for an unknown or removed template", () => {
    expect(getOfficialReferences("removed.template.v1")).toEqual([]);
  });

  it("shows references for a miss but keeps correct feedback compact", () => {
    const templateId = challengeTemplates[0]?.id as string;
    expect(getOfficialReferencesForFeedback(templateId, false).length)
      .toBeGreaterThan(0);
    expect(getOfficialReferencesForFeedback(templateId, true)).toEqual([]);
  });
});
