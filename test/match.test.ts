import { describe, expect, it } from "vitest";
import {
  commentTriggers,
  extractEmail,
  hasExcludedWord,
  matchesAllKeywords,
  matchesAnyKeyword,
  matchesKeyword,
} from "../src/engine/match";

describe("whole-word keyword matching (Acceptance: 'ai' fires on 'this ai' not 'fair')", () => {
  it("matches the keyword as a standalone word, case-insensitively", () => {
    expect(matchesKeyword("I like this ai", "ai")).toBe(true);
    expect(matchesKeyword("AI rocks!", "ai")).toBe(true);
    expect(matchesKeyword("love ai!", "ai")).toBe(true);
    expect(matchesKeyword("LINK please", "link")).toBe(true);
  });

  it("does NOT match the keyword as a substring inside another word", () => {
    expect(matchesKeyword("that's not fair", "ai")).toBe(false);
    expect(matchesKeyword("rain is coming", "ai")).toBe(false);
    expect(matchesKeyword("she said hi", "ai")).toBe(false);
  });

  it("treats emoji/punctuation adjacent to the word as boundaries", () => {
    expect(matchesKeyword("ai🔥", "ai")).toBe(true);
    expect(matchesKeyword("(ai)", "ai")).toBe(true);
    expect(matchesKeyword("...LINK...", "link")).toBe(true);
  });

  it("escapes regex-special characters so the dot is literal, not a wildcard", () => {
    expect(matchesKeyword("I use node.js daily", "node.js")).toBe(true);
    expect(matchesKeyword("nodexjs is not a thing", "node.js")).toBe(false); // '.' must not act as wildcard
  });

  it("matchesAnyKeyword returns true if any keyword hits", () => {
    expect(matchesAnyKeyword("send me the GUIDE", ["LINK", "GUIDE"])).toBe(true);
    expect(matchesAnyKeyword("nothing here", ["LINK", "GUIDE"])).toBe(false);
  });

  it("matchesAllKeywords returns true only if every keyword is present", () => {
    expect(matchesAllKeywords("send me the LINK and GUIDE", ["LINK", "GUIDE"])).toBe(true);
    expect(matchesAllKeywords("send me the GUIDE", ["LINK", "GUIDE"])).toBe(false);
    expect(matchesAllKeywords("LINK only", ["LINK", "GUIDE"])).toBe(false);
    expect(matchesAllKeywords("nothing here", ["LINK", "GUIDE"])).toBe(false);
    expect(matchesAllKeywords("anything", [])).toBe(false);
  });

  it("ignores case on accented/non-ASCII words too (plain \\b is ASCII-only and misses these)", () => {
    expect(matchesKeyword("I love CAFÉ today", "café")).toBe(true);
    expect(matchesKeyword("nos vemos MAÑANA", "mañana")).toBe(true);
    expect(matchesKeyword("Ich hätte gern ÜBER alles", "über")).toBe(true);
  });
});

describe("exclude words + trigger composition", () => {
  it("an excluded word cancels the trigger (same whole-word rule)", () => {
    expect(hasExcludedWord("this is a scam", ["scam"])).toBe(true);
    expect(hasExcludedWord("scampi for dinner", ["scam"])).toBe(false); // substring must not fire
    expect(commentTriggers("LINK but scam", ["LINK"], ["scam"])).toBe(false);
    expect(commentTriggers("LINK please", ["LINK"], ["scam"])).toBe(true);
  });

  it("commentTriggers defaults to match-any mode", () => {
    expect(commentTriggers("send me the GUIDE", ["LINK", "GUIDE"])).toBe(true);
    expect(commentTriggers("LINK please", ["LINK", "GUIDE"])).toBe(true);
    expect(commentTriggers("nothing", ["LINK", "GUIDE"])).toBe(false);
  });

  it("commentTriggers mode='all' requires every keyword", () => {
    expect(commentTriggers("send me the LINK and GUIDE", ["LINK", "GUIDE"], [], "all")).toBe(true);
    expect(commentTriggers("send me the GUIDE", ["LINK", "GUIDE"], [], "all")).toBe(false);
    expect(commentTriggers("LINK only", ["LINK", "GUIDE"], [], "all")).toBe(false);
  });

  it("commentTriggers mode='all' still respects exclude words", () => {
    expect(commentTriggers("LINK and GUIDE but scam", ["LINK", "GUIDE"], ["scam"], "all")).toBe(false);
    expect(commentTriggers("LINK and GUIDE please", ["LINK", "GUIDE"], ["scam"], "all")).toBe(true);
  });

  it("commentTriggers mode='none' triggers on any comment", () => {
    expect(commentTriggers("literally anything", [], [], "none")).toBe(true);
    expect(commentTriggers("hello world", [], [], "none")).toBe(true);
    expect(commentTriggers("🔥", [], [], "none")).toBe(true);
    expect(commentTriggers("a", ["LINK"], [], "none")).toBe(true);
  });

  it("commentTriggers mode='none' still respects exclude words", () => {
    expect(commentTriggers("this is a scam", [], ["scam"], "none")).toBe(false);
    expect(commentTriggers("totally fine", [], ["scam"], "none")).toBe(true);
  });
});

describe("email extraction (chip fallback)", () => {
  it("accepts a bare email", () => {
    expect(extractEmail("ryan@example.com")).toBe("ryan@example.com");
  });
  it("extracts an email embedded in a longer reply", () => {
    expect(extractEmail("sure, it's me@site.co thanks")).toBe("me@site.co");
  });
  it("rejects non-emails", () => {
    expect(extractEmail("no email here")).toBeNull();
    expect(extractEmail(undefined)).toBeNull();
  });
});
