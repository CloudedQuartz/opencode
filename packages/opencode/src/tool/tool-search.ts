import z from "zod"
import { Effect } from "effect"
import * as Tool from "./tool"
import { ToolCatalog } from "./catalog"
import { Session } from "../session"
import { Config } from "../config"
import type { AppRuntime as AppRuntimeType } from "@/effect/app-runtime"

export const ToolSearchTool = Tool.define(
  "tool_search",
  Effect.succeed({
    description: `Search for available tools by name, description, or capability. Use this whenever you hit limitations of your abilities.

Examples:
- "search for all the files in the subdirectory XYZ" --> tool_search("search")
- "list all the files in ../src" --> tool_search("list files")
- "find all issues in repository xxx/yy" --> tool_search("find issues")

How NOT to Use It:

- "search for all the files in the subdirectory XYZ" --> tool_search("XYZ")
- "list all the files in ../src" --> tool_search("../src")
- "find all issues in repository xxx/yy" --> tool_search("xxx/yyy")`,

    parameters: z.object({
      query: z.string().describe("Search query (keywords or patterns)"),
      category: z.enum(["all", "builtin", "mcp", "plugin"]).optional().describe("Filter by tool source"),
      pin: z.boolean().optional().describe("Pin these tools permanently for this session so they never expire"),
    }),

    execute(args: { query: string; category?: "all" | "builtin" | "mcp" | "plugin"; pin?: boolean }, ctx: Tool.Context) {
      return Effect.promise(async () => {
        // Dynamic import avoids circular module-init issue:
        // app-runtime -> ToolRegistry -> tool-search -> app-runtime (broken at bundle init time with static import)
        const { AppRuntime } = await import("@/effect/app-runtime") as { AppRuntime: typeof AppRuntimeType }
        const cfgInfo = await AppRuntime.runPromise(Config.Service.use((s) => s.get()))
        const maxTurns = args.pin ? 0 : (cfgInfo.toolSearch?.maxTurns ?? 10)
        const limit = cfgInfo.toolSearch?.searchLimit ?? 5

        const results = ToolCatalog.search(args.query, {
          limit,
          source: args.category === "all" ? undefined : args.category,
        })

        if (results.length === 0) {
          return {
            title: "No tools found",
            metadata: { query: args.query, count: 0, tools: [] as string[], displayOutput: "No tools found" },
            output: `No tools found matching "${args.query}". Try a different search term.`,
          }
        }

        const toolIDs = results.map((r) => r.id)
        Session.addDiscoveredTools(ctx.sessionID, toolIDs, maxTurns)

        // Persist pinned tools to DB so they survive session restarts
        if (args.pin) {
          const session = await AppRuntime.runPromise(Session.Service.use((s) => s.get(ctx.sessionID)))
          const merged = Array.from(new Set([...(session.pinned_tools ?? []), ...toolIDs]))
          await AppRuntime.runPromise(Session.Service.use((s) => s.setPinnedTools({ sessionID: ctx.sessionID, tools: merged })))
        }

        const toolNames = results.map((r) => r.id)
        return {
          title: `Found ${results.length} tools`,
          metadata: { query: args.query, count: results.length, tools: toolNames, displayOutput: toolNames.join("\n") },
          output: `Now you can also use the following tools: ${toolNames.join(", ")}`,
        }
      })
    },
  }),
)
