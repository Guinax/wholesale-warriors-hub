import { describe, expect, it } from "vitest";
import { pendingTrackingCode, trackingLabel } from "@/lib/orderUtils";

describe("Shipment tracking", () => {
  it("shows an awaiting-shipment label until a carrier supplies tracking", () => {
    expect(trackingLabel(null)).toBe("Aguardando envio");
    expect(trackingLabel(pendingTrackingCode("FM-ORDER-1"))).toBe("Aguardando envio");
    expect(trackingLabel("FM-P-LOCAL-ORDER")).toBe("Aguardando envio");
  });
  it("keeps a distinct internal reference for each unshipped order", () => {
    expect(pendingTrackingCode("FM-1")).not.toBe(pendingTrackingCode("FM-2"));
  });
  it("shows the actual carrier reference without generating a replacement", () => {
    expect(trackingLabel("  AB123456789BR  ")).toBe("AB123456789BR");
  });
});
