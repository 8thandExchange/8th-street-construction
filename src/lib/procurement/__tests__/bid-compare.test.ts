import { describe, expect, it } from "vitest";
import { bidLevelingStats, matchRecommendedBidId } from "../bid-compare";

describe("bidLevelingStats", () => {
  it("computes spread against the low bid", () => {
    expect(bidLevelingStats([8000, 10000, 9000])).toEqual({
      count: 3,
      low: 8000,
      high: 10000,
      average: 9000,
      spreadPct: 25,
    });
  });

  it("ignores empty and non-positive amounts", () => {
    expect(bidLevelingStats([])).toEqual({
      count: 0,
      low: 0,
      high: 0,
      average: 0,
      spreadPct: 0,
    });
  });
});

describe("matchRecommendedBidId", () => {
  const bids = [
    { id: "low", company: "Apex Framing", amount: 7000 },
    { id: "mid", company: "CSRA Builders", amount: 9000 },
    { id: "high", company: "Pad Co", amount: 14000 },
  ];

  it("picks the company named in the recommendation", () => {
    expect(
      matchRecommendedBidId(bids, {
        recommendation: "Award to CSRA Builders after confirming lumber inclusions.",
        bids: [],
      })
    ).toBe("mid");
  });

  it("falls back to a normal-flagged company, then closest to average", () => {
    expect(
      matchRecommendedBidId(bids, {
        recommendation: "Clarify the low bid before awarding.",
        bids: [{ company: "CSRA Builders", flag: "normal" }],
      })
    ).toBe("mid");
    expect(
      matchRecommendedBidId(bids, {
        recommendation: "No named winner.",
        bids: [],
      })
    ).toBe("mid");
  });
});
