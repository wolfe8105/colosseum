// ============================================================
// INTEGRATOR --- src/rivals-presence.ts >>> rivals-presence-channel (seam 499)
// Mock boundary: @supabase/supabase-js only
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const mockTrack = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSubscribeCallback = vi.hoisted(() => ({ fn: null as ((s: string, e?: Error) => void) | null }));
const mockJoinHandlers: Array<(arg: { newPresences: Array<Record<string, unknown>> }) => void> = [];
const mockLeaveHandlers: Array<(arg: { leftPresences: Array<Record<string, unknown>> }) => void> = [];
const mockChannelInstance = vi.hoisted(() => ({ on: vi.fn(), subscribe: vi.fn(), track: mockTrack }));
const mockRemoveChannel = vi.hoisted(() => vi.fn());
const mockSetAuth = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockChannel = vi.hoisted(() => vi.fn().mockImplementation(() => mockChannelInstance));
const mockRpc = vi.hoisted(() => vi.fn());
const mockFrom = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn().mockResolvedValue({ data: { session: null }, error: null }));
const mockOnAuthStateChange = vi.hoisted(() => vi.fn());

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
    from: mockFrom,
    auth: { onAuthStateChange: mockOnAuthStateChange, getSession: mockGetSession },
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
    realtime: { setAuth: mockSetAuth },
  })),
}));

describe("ARCH", () => {
  it("rivals-presence.ts imports buildRivalSet and startPresence from rivals-presence-channel", () => {
    const src = readFileSync(resolve(__dirname, "../../src/rivals-presence.ts"), "utf8");
    const lines = src.split("\n").filter((l) => /from\s+['"]/.test(l));
    const ch = lines.find((l) => l.includes("rivals-presence-channel"));
    expect(ch).toBeTruthy();
    expect(ch).toMatch(/buildRivalSet/);
    expect(ch).toMatch(/startPresence/);
  });
  it("rivals-presence-channel.ts imports getMyRivals from auth", () => {
    const src = readFileSync(resolve(__dirname, "../../src/rivals-presence-channel.ts"), "utf8");
    const lines = src.split("\n").filter((l) => /from\s+['"]/.test(l));
    const a = lines.find((l) => l.includes("./auth"));
    expect(a).toBeTruthy();
    expect(a).toMatch(/getMyRivals/);
  });
});

function makeP(user_id: string, username = "user1") { return { user_id, username, display_name: username }; }

let buildRivalSet: (set: Set<string>) => Promise<void>;
let startPresence: (state: import("../../src/rivals-presence-channel.ts").ChannelState) => Promise<void>;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "clearTimeout", "clearInterval"] });
  mockRpc.mockReset(); mockFrom.mockReset(); mockOnAuthStateChange.mockReset();
  mockOnAuthStateChange.mockImplementation(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockRemoveChannel.mockReset();
  mockSetAuth.mockReset().mockResolvedValue(undefined);
  mockTrack.mockReset().mockResolvedValue(undefined);
  mockJoinHandlers.length = 0; mockLeaveHandlers.length = 0; mockSubscribeCallback.fn = null;
  mockChannelInstance.on.mockReset().mockImplementation((_t: string, f: { event: string }, h: (...a: unknown[]) => void) => {
    if (f?.event === "join") mockJoinHandlers.push(h as (arg: { newPresences: Array<Record<string, unknown>> }) => void);
    if (f?.event === "leave") mockLeaveHandlers.push(h as (arg: { leftPresences: Array<Record<string, unknown>> }) => void);
    return mockChannelInstance;
  });
  mockChannelInstance.subscribe.mockReset().mockImplementation((cb: (s: string, e?: Error) => void) => { mockSubscribeCallback.fn = cb; return mockChannelInstance; });
  mockChannel.mockReset().mockReturnValue(mockChannelInstance);
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: "user-self-uuid", email: "self@test.com" }, access_token: "tok" } }, error: null });
  mockOnAuthStateChange.mockImplementation((cb: (ev: string, s: unknown) => void) => {
    cb("INITIAL_SESSION", { user: { id: "user-self-uuid", email: "self@test.com" }, access_token: "tok" });
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  mockRpc.mockImplementation((name: string) => name === "get_my_rivals" ? Promise.resolve({ data: [], error: null }) : Promise.resolve({ data: null, error: null }));
  const mod = await import("../../src/rivals-presence-channel.ts");
  buildRivalSet = mod.buildRivalSet;
  startPresence = mod.startPresence;
});

afterEach(() => { vi.useRealTimers(); });

describe("TC-1: buildRivalSet populates set with accepted rival IDs", () => {
  it("adds rival_id for non-pending rivals", async () => {
    mockRpc.mockImplementation((n: string) => n === "get_my_rivals" ? Promise.resolve({ data: [{ rival_id: "rival-aaa", status: "accepted" }, { rival_id: "rival-bbb", status: "active" }], error: null }) : Promise.resolve({ data: null, error: null }));
    const set = new Set<string>();
    await buildRivalSet(set);
    expect(set.has("rival-aaa")).toBe(true);
    expect(set.has("rival-bbb")).toBe(true);
    expect(set.size).toBe(2);
  });
});

describe("TC-2: buildRivalSet skips pending rivals", () => {
  it("does not add rival_id when status is pending", async () => {
    mockRpc.mockImplementation((n: string) => n === "get_my_rivals" ? Promise.resolve({ data: [{ rival_id: "rival-pending", status: "pending" }, { rival_id: "rival-accepted", status: "accepted" }], error: null }) : Promise.resolve({ data: null, error: null }));
    const set = new Set<string>();
    await buildRivalSet(set);
    expect(set.has("rival-pending")).toBe(false);
    expect(set.has("rival-accepted")).toBe(true);
  });
});

describe("TC-3: buildRivalSet clears stale data before populating", () => {
  it("clears existing entries before adding new ones", async () => {
    mockRpc.mockImplementation((n: string) => n === "get_my_rivals" ? Promise.resolve({ data: [{ rival_id: "new-rival", status: "accepted" }], error: null }) : Promise.resolve({ data: null, error: null }));
    const set = new Set<string>(["stale-1", "stale-2"]);
    await buildRivalSet(set);
    expect(set.has("stale-1")).toBe(false);
    expect(set.has("new-rival")).toBe(true);
  });
  it("clears the set even when getMyRivals rejects", async () => {
    mockRpc.mockImplementation((n: string) => n === "get_my_rivals" ? Promise.reject(new Error("net")) : Promise.resolve({ data: null, error: null }));
    const set = new Set<string>(["stale-id"]);
    await buildRivalSet(set);
    expect(set.size).toBe(0);
  });
});

describe("TC-4: startPresence creates global-online channel", () => {
  it("calls supabase.channel with global-online and presence key = user.id", async () => {
    const rivalSet = new Set<string>(); const onlineRivals = new Set<string>(); const channelRef: { value: null } = { value: null }; const onAlert = vi.fn();
    await startPresence({ rivalSet, onlineRivals, channelRef, onAlert });
    expect(mockChannel).toHaveBeenCalledWith("global-online", expect.objectContaining({ config: expect.objectContaining({ presence: expect.objectContaining({ key: "user-self-uuid" }) }) }));
  });
});

describe("TC-5: presence join fires onAlert only for rivals", () => {
  it("calls onAlert when a known rival joins", async () => {
    const rivalSet = new Set<string>(["rival-xyz"]); const onlineRivals = new Set<string>(); const channelRef: { value: null } = { value: null }; const onAlert = vi.fn();
    await startPresence({ rivalSet, onlineRivals, channelRef, onAlert });
    expect(mockJoinHandlers.length).toBeGreaterThan(0);
    mockJoinHandlers[0]({ newPresences: [makeP("rival-xyz")] });
    expect(onAlert).toHaveBeenCalledTimes(1);
    expect(onAlert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "rival-xyz" }));
  });
  it("does not call onAlert for non-rival users", async () => {
    const rivalSet = new Set<string>(["rival-xyz"]); const onlineRivals = new Set<string>(); const channelRef: { value: null } = { value: null }; const onAlert = vi.fn();
    await startPresence({ rivalSet, onlineRivals, channelRef, onAlert });
    mockJoinHandlers[0]({ newPresences: [makeP("random-user")] });
    expect(onAlert).not.toHaveBeenCalled();
  });
  it("does not call onAlert for own user_id (self-join)", async () => {
    const rivalSet = new Set<string>(["user-self-uuid"]); const onlineRivals = new Set<string>(); const channelRef: { value: null } = { value: null }; const onAlert = vi.fn();
    await startPresence({ rivalSet, onlineRivals, channelRef, onAlert });
    mockJoinHandlers[0]({ newPresences: [makeP("user-self-uuid")] });
    expect(onAlert).not.toHaveBeenCalled();
  });
  it("does not re-alert if rival already in onlineRivals", async () => {
    const rivalSet = new Set<string>(["rival-xyz"]); const onlineRivals = new Set<string>(["rival-xyz"]); const channelRef: { value: null } = { value: null }; const onAlert = vi.fn();
    await startPresence({ rivalSet, onlineRivals, channelRef, onAlert });
    mockJoinHandlers[0]({ newPresences: [makeP("rival-xyz")] });
    expect(onAlert).not.toHaveBeenCalled();
  });
});

describe("TC-6: presence leave removes from onlineRivals", () => {
  it("deletes rival from onlineRivals on leave", async () => {
    const rivalSet = new Set<string>(["rival-xyz"]); const onlineRivals = new Set<string>(["rival-xyz"]); const channelRef: { value: null } = { value: null }; const onAlert = vi.fn();
    await startPresence({ rivalSet, onlineRivals, channelRef, onAlert });
    expect(mockLeaveHandlers.length).toBeGreaterThan(0);
    mockLeaveHandlers[0]({ leftPresences: [makeP("rival-xyz")] });
    expect(onlineRivals.has("rival-xyz")).toBe(false);
  });
  it("allows re-alert after leave + rejoin", async () => {
    const rivalSet = new Set<string>(["rival-xyz"]); const onlineRivals = new Set<string>(); const channelRef: { value: null } = { value: null }; const onAlert = vi.fn();
    await startPresence({ rivalSet, onlineRivals, channelRef, onAlert });
    mockJoinHandlers[0]({ newPresences: [makeP("rival-xyz")] });
    expect(onAlert).toHaveBeenCalledTimes(1);
    mockLeaveHandlers[0]({ leftPresences: [makeP("rival-xyz")] });
    expect(onlineRivals.has("rival-xyz")).toBe(false);
    mockJoinHandlers[0]({ newPresences: [makeP("rival-xyz")] });
    expect(onAlert).toHaveBeenCalledTimes(2);
  });
});

describe("TC-7: startPresence calls realtime.setAuth", () => {
  it("calls supabase.realtime.setAuth() before channel creation", async () => {
    const rivalSet = new Set<string>(); const onlineRivals = new Set<string>(); const channelRef: { value: null } = { value: null }; const onAlert = vi.fn();
    await startPresence({ rivalSet, onlineRivals, channelRef, onAlert });
    expect(mockSetAuth).toHaveBeenCalled();
  });
});
