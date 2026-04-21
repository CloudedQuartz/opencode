import { describe, it, expect } from "bun:test"
import * as Session from "@/session/session"

describe("Session discovered tools", () => {
  it("should add and track discovered tools with custom maxTurns", () => {
    const sessionID = "test-session-1"
    
    // Add tool with 3 turns
    Session.addDiscoveredTools(sessionID, ["bash"], 3)
    
    const discovered = Session.getDiscoveredTools(sessionID)
    expect(discovered.has("bash")).toBe(true)
    
    // Tick once - should have 2 turns left
    Session.tickDiscoveredTools(sessionID)
    expect(Session.getDiscoveredTools(sessionID).has("bash")).toBe(true)
    
    // Tick again - should have 1 turn left
    Session.tickDiscoveredTools(sessionID)
    expect(Session.getDiscoveredTools(sessionID).has("bash")).toBe(true)
    
    // Tick third time - should be removed
    Session.tickDiscoveredTools(sessionID)
    expect(Session.getDiscoveredTools(sessionID).has("bash")).toBe(false)
    
    // Cleanup
    Session.clearDiscoveredTools(sessionID)
  })

  it("should keep pinned tools (maxTurns=0) indefinitely", () => {
    const sessionID = "test-session-2"
    
    // Add tool with 0 turns (infinite/pinned)
    Session.addDiscoveredTools(sessionID, ["tool_search"], 0)
    
    // Tick multiple times
    Session.tickDiscoveredTools(sessionID)
    Session.tickDiscoveredTools(sessionID)
    Session.tickDiscoveredTools(sessionID)
    
    // Should still be there
    expect(Session.getDiscoveredTools(sessionID).has("tool_search")).toBe(true)
    
    // Cleanup
    Session.clearDiscoveredTools(sessionID)
  })

  it("should handle multiple tools with different turn counts", () => {
    const sessionID = "test-session-3"
    
    // Add tools with different turn counts
    Session.addDiscoveredTools(sessionID, ["short"], 2)
    Session.addDiscoveredTools(sessionID, ["long"], 5)
    Session.addDiscoveredTools(sessionID, ["pinned"], 0)
    
    // After 2 ticks, short should be gone
    Session.tickDiscoveredTools(sessionID)
    Session.tickDiscoveredTools(sessionID)
    expect(Session.getDiscoveredTools(sessionID).has("short")).toBe(false)
    expect(Session.getDiscoveredTools(sessionID).has("long")).toBe(true)
    expect(Session.getDiscoveredTools(sessionID).has("pinned")).toBe(true)
    
    // Cleanup
    Session.clearDiscoveredTools(sessionID)
  })
})
