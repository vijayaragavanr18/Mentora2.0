/**
 *--------------------------------------------------------------------------------
 * PageLM - Custom Express Server Implementation
 *--------------------------------------------------------------------------------
 * @author    - Vijayaragavan R (https://github.com/vijayaragavanr18)
 * @github    - https://github.com/vijayaragavanr18/pagelm
 * @version   - 1.0.0
 *--------------------------------------------------------------------------------
 * Secure Express-based server with WebSocket support
 *--------------------------------------------------------------------------------
**/

import express, { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import { createServer as createHTTPServer } from 'http';
import { Server as WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';
import path from 'path';
import fs from 'fs';

export interface ServerInstance {
  use: (middleware: any) => void;
  listen: (port: number, callback?: () => void) => any;
  get: (path: string, handler: any) => void;
  post: (path: string, handler: any) => void;
  put: (path: string, handler: any) => void;
  delete: (path: string, handler: any) => void;
  patch: (path: string, handler: any) => void;
  options: (path: string, handler: any) => void;
  head: (path: string, handler: any) => void;
  all: (path: string, handler: any) => void;
  ws: (path: string, handler: (ws: any, req: any) => void) => void;
  serverStatic: (endpoint: string, directory: string) => any;
  getRoutes: () => Record<string, string[]>;
  routes: any[];
}

export default function server(): ServerInstance {
  const app: Express = express();
  console.log('[Express] Created Express app, type:', typeof app);
  console.log('[Express] App is callable:', typeof app === 'function');
  
  // Add request logging middleware FIRST to catch ALL requests
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[REQUEST] ${req.method} ${req.url} from ${req.socket.remoteAddress}`);
    next();
  });
  
  // CRITICAL FIX: Just pass the Express app directly to createHTTPServer
  // Express app IS a request handler function
  const httpServer = createHTTPServer(app);
  console.log('[Express] Created HTTP server with Express app as handler');
  
  const wss = new WebSocketServer({ noServer: true });

  // Track routes
  const ROUTES: any[] = [];
  const wsRoutes: { path: string; handler: (ws: any, req: any) => void }[] = [];

  // Handle WebSocket upgrades
  httpServer.on('upgrade', (req, socket, head) => {
    const u = parse(req.url || '', true);
    const pathname = u.pathname;

    if (!pathname || pathname.includes('..') || /[\0-\x1F\x7F]/.test(pathname)) {
      socket.destroy();
      return;
    }

    const route = wsRoutes.find((r) => r.path === pathname);
    if (route) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        route.handler(ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  // Static file server
  const serverStatic = (endpoint: string, directory: string) => {
    const resolvedDir = path.resolve(directory);
    
    if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
      console.error(`[STATIC] Directory not found: ${resolvedDir}`);
      return (_req: any, _res: any, next: any) => next();
    }

    const staticMiddleware = express.static(resolvedDir, {
      maxAge: '1d',
      etag: true,
    });

    return (req: any, res: any, next: any) => {
      if (req.path.startsWith(endpoint)) {
        req.url = req.path.substring(endpoint.length);
        return staticMiddleware(req, res, next);
      }
      next();
    };
  };

  // Route methods
  const get = (routePath: string, handler: any) => {
    ROUTES.push({ method: 'GET', path: routePath });
    console.log(`[Express] Registering GET ${routePath}`);
    app.get(routePath, handler);
  };

  const post = (routePath: string, handler: any) => {
    ROUTES.push({ method: 'POST', path: routePath });
    console.log(`[Express] Registering POST ${routePath}`);
    app.post(routePath, handler);
  };

  const put = (routePath: string, handler: any) => {
    ROUTES.push({ method: 'PUT', path: routePath });
    app.put(routePath, handler);
  };

  const del = (routePath: string, handler: any) => {
    ROUTES.push({ method: 'DELETE', path: routePath });
    app.delete(routePath, handler);
  };

  const patch = (routePath: string, handler: any) => {
    ROUTES.push({ method: 'PATCH', path: routePath });
    app.patch(routePath, handler);
  };

  const options = (routePath: string, handler: any) => {
    ROUTES.push({ method: 'OPTIONS', path: routePath });
    app.options(routePath, handler);
  };

  const head = (routePath: string, handler: any) => {
    ROUTES.push({ method: 'HEAD', path: routePath });
    app.head(routePath, handler);
  };

  const all = (routePath: string, handler: any) => {
    ROUTES.push({ method: 'ALL', path: routePath });
    app.all(routePath, handler);
  };

  // WebSocket route registration
  const ws = (routePath: string, handler: (ws: any, req: any) => void) => {
    wsRoutes.push({ path: routePath, handler });
    console.log(`[WS] Registered WebSocket route: ${routePath}`);
  };

  // Middleware
  const use = (middleware: any) => {
    console.log(`[Express] Adding middleware:`, middleware.name || 'anonymous');
    app.use(middleware);
  };

  // Get routes
  const getRoutes = () => {
    return ROUTES.reduce((acc, { method, path }) => {
      if (!acc[method]) acc[method] = [];
      acc[method].push(path);
      return acc;
    }, {} as Record<string, string[]>);
  };

  // Listen
  const listen = (port: number, callback?: () => void) => {
    console.log(`[Server] About to listen on port ${port}...`);
    
    httpServer.setTimeout(300000);
    httpServer.keepAliveTimeout = 65000;
    httpServer.headersTimeout = 66000;

    httpServer.on('error', (err: any) => {
      console.error('[Server Error]:', err);
    });

    // CRITICAL FIX: Bind to IPv4 0.0.0.0 explicitly instead of letting Node.js choose IPv6 ::
    // On Windows, IPv6 :: binding doesn't automatically accept IPv4 localhost connections
    const serverInstance = httpServer.listen(port, '0.0.0.0', () => {
      console.log(`[Server] Listen callback started`);
      console.log(`[Server] Bound to IPv4 0.0.0.0:${port}`);
      if (callback) {
        try {
          callback();
          console.log(`[Server] Callback completed successfully`);
        } catch (e) {
          console.error('[Server] Error in listen callback:', e);
          throw e;
        }
      }
    });
    
    console.log(`[Server] Returned from listen()`);
    return serverInstance;
  };

  return {
    use,
    listen,
    get,
    post,
    put,
    delete: del,
    patch,
    options,
    head,
    all,
    ws,
    serverStatic,
    getRoutes,
    routes: ROUTES,
  };
}
