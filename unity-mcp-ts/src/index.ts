import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { HandlerAdapter } from "./core/HandlerAdapter.js";
import { HandlerDiscovery, HandlerType } from "./core/HandlerDiscovery.js";
import { UnityConnection } from "./core/UnityConnection.js";
import { CommandRegistry } from "./core/CommandRegistry.js";
import { ResourceRegistry } from "./core/ResourceRegistry.js";
import { PromptRegistry } from "./core/PromptRegistry.js";
import { registerUnityClientTools } from "./core/UnityClientHandler.js";
import * as net from 'net';
import { spawn } from 'child_process';

/**
 * Checks if a port is currently in use
 * @param port The port number to check
 * @param host The host to check on
 * @returns Promise that resolves to true if port is in use, false otherwise
 */
async function isPortInUse(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(port, host, () => {
      server.close(() => resolve(false)); // Port is available
    });

    server.on('error', () => resolve(true)); // Port is in use
  });
}

/**
 * Gets the PID of the process using a specific port
 * @param port The port number to check
 * @returns Promise that resolves to the PID or null if not found
 */
async function getProcessUsingPort(port: number): Promise<number | null> {
  return new Promise((resolve) => {
    const cmd = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -ti :${port}`;

    const child = spawn('sh', ['-c', cmd], { stdio: 'pipe' });
    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0 && output.trim()) {
        if (process.platform === 'win32') {
          // Windows netstat output parsing
          const lines = output.trim().split('\n');
          for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 4) {
              const pid = parseInt(parts[parts.length - 1]);
              if (!isNaN(pid)) {
                resolve(pid);
                return;
              }
            }
          }
        } else {
          // Unix lsof output parsing
          const pid = parseInt(output.trim().split('\n')[0]);
          if (!isNaN(pid)) {
            resolve(pid);
            return;
          }
        }
      }
      resolve(null);
    });

    child.on('error', () => resolve(null));
  });
}

/**
 * Kills a process by PID
 * @param pid The process ID to kill
 * @returns Promise that resolves to true if successful, false otherwise
 */
async function killProcess(pid: number): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      process.kill(pid, 'SIGTERM');
      // Wait a bit and check if process is still alive
      setTimeout(() => {
        try {
          process.kill(pid, 0); // Check if process exists
          // If we reach here, process is still alive, force kill
          process.kill(pid, 'SIGKILL');
        } catch {
          // Process is dead, that's what we want
        }
        resolve(true);
      }, 1000);
    } catch (error) {
      resolve(false);
    }
  });
}

/**
 * Main entry point for the MCP server application.
 * This server acts as a bridge between LLMs and Unity clients.
 */
async function main() {
  try {
    // Initialize MCP server with the official SDK
    const mcpServer = new McpServer({
      name: "unity-mcp",
      version: "1.0.0"
    });

    // Initialize UnityConnection in server mode
    const unityConnection = UnityConnection.getInstance();

    // Configure from environment variables or defaults
    const host = process.env.MCP_HOST || '127.0.0.1';
    const port = parseInt(process.env.MCP_PORT || '27182', 10);
    const forceKill = process.env.MCP_FORCE_KILL === 'true' || process.env.MCP_FORCE_KILL === '1';

    // Check if port is already in use
    if (await isPortInUse(port, host)) {
      const pid = await getProcessUsingPort(port);

      if (forceKill && pid) {
        console.error(`[INFO] Port ${port} is in use by process ${pid}. Attempting to kill it...`);
        const killed = await killProcess(pid);

        if (killed) {
          console.error(`[INFO] Successfully killed process ${pid}. Continuing startup...`);
          // Wait a moment for the port to be released
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          console.error(`[ERROR] Failed to kill process ${pid}. Cannot start server.`);
          console.error(`[HELP] Try running: kill ${pid}`);
          process.exit(1);
        }
      } else {
        console.error(`[ERROR] Port ${port} is already in use${pid ? ` by process ${pid}` : ''}.`);
        console.error(`[HELP] Another MCP server may already be running.`);
        console.error(`[HELP] To automatically kill the existing process, set environment variable: UNITY_MCP_FORCE_KILL=true`);
        if (pid) {
          console.error(`[HELP] Or manually kill it: kill ${pid}`);
        }
        process.exit(1);
      }
    }

    unityConnection.configure(host, port);

    // Create registries
    const commandRegistry = new CommandRegistry();
    const resourceRegistry = new ResourceRegistry();
    const promptRegistry = new PromptRegistry();

    // Create handler adapter
    const handlerAdapter = new HandlerAdapter(mcpServer);

    // Create handler discovery with Unity connection and registries
    const handlerDiscovery = new HandlerDiscovery(
        handlerAdapter,
        unityConnection,
        commandRegistry,
        resourceRegistry,
        promptRegistry
    );

    // Start the unity connection server
    try {
      await unityConnection.start();
      console.error(`[INFO] Started MCP server on ${host}:${port}, waiting for Unity clients to connect`);
    } catch (err) {
      console.error(`[ERROR] Failed to start Unity connection server: ${err instanceof Error ? err.message : String(err)}`);
      console.error('[WARN] Continuing execution, but Unity functionality may be limited');
      // Continue execution - Unity clients will attempt to connect
    }

    // Register unity client management tools
    registerUnityClientTools(mcpServer);

    // Discover and register handlers
    const counts = await handlerDiscovery.discoverAndRegisterHandlers();
    console.error(`[INFO] Discovered and registered:
      Command Handlers: ${counts[HandlerType.COMMAND]}
      Resource Handlers: ${counts[HandlerType.RESOURCE]}
      Prompt Handlers: ${counts[HandlerType.PROMPT]}`);

    // Register connection status change events
    unityConnection.on('clientConnected', (client) => {
      console.error(`[INFO] Unity client connected: ${client.clientId}`);
    });

    unityConnection.on('clientDisconnected', (client) => {
      console.error(`[INFO] Unity client disconnected: ${client.clientId}`);
    });

    unityConnection.on('clientRegistered', (client) => {
      console.error(`[INFO] Unity client registered: ${client.clientId}`);
      console.error(`[INFO] Client info: ${JSON.stringify(client.info)}`);
    });

    unityConnection.on('activeClientChanged', (client) => {
      console.error(`[INFO] Active Unity client changed to: ${client.clientId}`);
    });

    // Create transport using standard I/O for MCP communication
    const transport = new StdioServerTransport();

    // Connect the server to the transport
    await mcpServer.connect(transport);

    console.error("[INFO] Unity MCP Server running on stdio");
  } catch (error) {
    console.error(`[ERROR] Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Shutdown handling
process.on("SIGINT", () => {
  console.error("[INFO] Shutting down...");
  const unityConnection = UnityConnection.getInstance();
  unityConnection.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("[INFO] Shutting down...");
  const unityConnection = UnityConnection.getInstance();
  unityConnection.stop();
  process.exit(0);
});

// Handle uncaught exceptions to prevent crashing
process.on('uncaughtException', (error) => {
  const errorCode = 'code' in error ? `[Code: ${(error as any).code}] ` : '';
  console.error(`[ERROR] Uncaught exception: ${errorCode}${error.message}`);
  console.error(error.stack);
  // Do not exit the process
});

// Handle unhandled promise rejections to prevent crashing
process.on('unhandledRejection', (reason, promise) => {
  if (reason instanceof Error) {
    const errorCode = 'code' in reason ? `[Code: ${(reason as any).code}] ` : '';
    console.error(`[ERROR] Unhandled Promise rejection: ${errorCode}${reason.message}`);
    console.error(reason.stack);
  } else {
    console.error('[ERROR] Unhandled Promise rejection at:', promise);
    console.error('Reason:', reason);
  }
  // Do not exit the process
});

// Execute main function
main().catch(error => {
  console.error(`[FATAL] Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
