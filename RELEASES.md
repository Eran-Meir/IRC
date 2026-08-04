# Release History

## v0.5.39-alpha (Enter Key Form Submission Fix, App.css Rank Colors & Duplicate QUIT Fix)
* **Bug Fix (React Client UI & Input Submission)**
  * **Enter Key Input Submission**: Intercepted `e.key === 'Enter'` in [client/src/components/MessageInput.tsx](file:///c:/Users/Eran/IRC/client/src/components/MessageInput.tsx#L47), cleared text input *before* triggering `onSendMessage`, and wrapped execution in `try...catch`. Resolves stuck input text and guarantees Enter key command/message execution.
  * **App.css Rank Color Rules**: Added explicit `.user-badge.op, .user-nick.op` (`#d4af37` gold) and rank color rules with `!important` tags directly to [client/src/App.css](file:///c:/Users/Eran/IRC/client/src/App.css#L325). Prevents nickname text from inheriting default green accent color in the User List.
  * **Duplicate QUIT Message Elimination**: Extracted `addMessage` calls outside the `setChannels` state update function in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L214). Prevents React state updater re-executions from printing duplicate `QUIT` system messages in chat streams.

## v0.5.38-alpha (Traefik HelmChartConfig 24h IdleTimeout & Stale Closure Fix)
* **Bug Fix (DevOps, Infrastructure & React Client)**
  * **Traefik 24h IdleTimeout HelmChartConfig**: Created [services/ircd/deploy/traefik-config.yaml](file:///c:/Users/Eran/IRC/services/ircd/deploy/traefik-config.yaml) using K3s `HelmChartConfig` manifest. Configures Traefik's `web` and `websecure` entrypoint `idleTimeout: "86400s"` (24 hours, fixing premature `0s` 0-second disconnects), replacing invalid per-ingress annotations in [client-deployment.yaml](file:///c:/Users/Eran/IRC/services/ircd/deploy/client-deployment.yaml#L52).
  * **React Stale Closure Resolution**: Refactored `handleIncomingLine` event subscription in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L402) using `handleIncomingLineRef` pattern. Guarantees WebSocket callbacks always invoke the latest render state, fixing `/join` window target switching and channel state synchronization.

## v0.5.37-alpha (Classic-Light Rank Color Fix, Channel Membership Seeding & Messaging Unblock)
* **Bug Fix (React Client UI & CSS)**
  * **Classic-Light Rank Color Selectors**: Changed all `[data-theme='light']` CSS selectors in [client/src/index.css](file:///c:/Users/Eran/IRC/client/src/index.css#L135) to `[data-theme='classic-light']`. The theme attribute was `classic-light` but the CSS overrides targeted `light`, so rank colors (Op gold `#d4af37`, Protected magenta `#cc0044`, HalfOp teal, Voice dark gold) never applied. Operator nicks fell through to `var(--accent-green)` (`#008000` in classic-light), rendering green instead of gold.
  * **Channel Membership Seeding**: Added `joinedChannelsRef.current.add('#enterprise')` and `#devops` inside `connectWebSocket` in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L424). The ref was never seeded on initial connection, causing the `handleSendMessage` membership check to silently block all channel messages.

## v0.5.36-alpha (Server-Side Keepalive PING for Idle WebSockets)
* **Bug Fix & Network Reliability (Go Daemon & React Client)**
  * **Server-Side PING Implementation**: Added a 30-second `PING :irc.enterprise.local` keepalive ticker directly into `Client.Handle()` in [services/ircd/internal/server/client.go](file:///c:/Users/Eran/IRC/services/ircd/internal/server/client.go). This ensures the Go IRCd actively maintains connections even if the client's browser tab is backgrounded.
  * **Client PING Removal**: Removed the unreliable `setInterval` client-side ping from [client/src/services/websocket.ts](file:///c:/Users/Eran/IRC/client/src/services/websocket.ts) to eliminate vulnerability to browser background tab throttling. Client now seamlessly replies with `PONG` to server pings.

## v0.5.35-alpha (WebSocket RFC 6455 Ping/Pong Handling, Traefik Zero-Timeout Ingress & Rank Color Fix)
* **Bug Fix & Network Reliability (Go Daemon, Traefik & React Client UI)**
  * **RFC 6455 WebSocket Ping/Pong Control Frames**: Implemented native Opcode `0x9` (Ping) and `0xA` (Pong) frame processing in [services/ircd/internal/server/websocket.go](file:///c:/Users/Eran/IRC/services/ircd/internal/server/websocket.go#L72). The Go daemon now immediately replies with Pong control frames (`0x8a`), preventing browsers and ingress proxies from dropping idle connections.
  * **Traefik Ingress Zero-Timeout Annotations**: Added `traefik.ingress.kubernetes.io/request-timeout: "0s"` and `read-timeout: "0s"` to [services/ircd/deploy/client-deployment.yaml](file:///c:/Users/Eran/IRC/services/ircd/deploy/client-deployment.yaml#L53), eliminating Traefik's default 60-second connection drops for idle WebSockets.
  * **Channel Operator Rank Color Fix**: Changed `.user-badge.op` and `.user-nick.op` styling in [client/src/index.css](file:///c:/Users/Eran/IRC/client/src/index.css#L116) and light mode theme to Gold (`#ffcc00` / `#d4af37`), eliminating green operator nickname styling.
  * **Rejoin Deduplication & System Message Cleanup**: Updated `JOIN`, `PART`, and `QUIT` line handlers in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L150) with `isSystem: true` and `joinedChannelsRef` deduplication. Prevents `* System *` double prefixing and suppresses duplicate rejoin lines upon network reconnects.
* **Bug Fix (Go Daemon & React Client UI)**
  * **Classic Light Mode Solid Black Nicknames**: Updated `.msg-line .sender` in [client/src/App.css](file:///c:/Users/Eran/IRC/client/src/App.css#L274) to use `var(--text-main)` (`#000000` solid black in light mode), eliminating neon green text for sender nicknames.
  * **Optimistic Channel Messaging**: Added immediate local message rendering in `handleSendMessage` in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L580) for channel `PRIVMSG` commands. Channel messages now render instantly in the sender's chat stream without relying on Pub/Sub echo.
  * **Input Box Reset on Target Switch**: Added `useEffect` in [client/src/components/MessageInput.tsx](file:///c:/Users/Eran/IRC/client/src/components/MessageInput.tsx#L18) resetting input text and history index whenever switching active channels (`activeTarget`), guaranteeing the text box is cleared on `/join #k`.
  * **Empty Channel Operator `@` Rank Grant**: Let server `353` RPL_NAMREPLY populate channel member ranks on `/join` in `App.tsx`, guaranteeing the first user joining an empty channel (`/join #k`) receives `@` Operator status.

## v0.5.33-alpha (Duplicate Nick Registration Protection, Command History & Ctrl+C Clearing)
* **Feature & Bug Fix (Go Daemon & React Client)**
  * **Duplicate Nick Registration Defense**: Updated `handleNick` in [services/ircd/internal/server/router.go](file:///c:/Users/Eran/IRC/services/ircd/internal/server/router.go#L63) to verify `RegisterNick` availability *before* unregistering existing nick, preventing multi-user nick collisions when changing nicks to short names like `k`.
  * **20-Item Command History Stack**: Added **Up Arrow** and **Down Arrow** key navigation in [client/src/components/MessageInput.tsx](file:///c:/Users/Eran/IRC/client/src/components/MessageInput.tsx#L35). Preserves a 20-command stack allowing seamless scrolling through recent commands/messages.
  * **`Ctrl + C` Line Clearing**: Added `Ctrl + C` keydown shortcut in `MessageInput.tsx` to instantly clear the active input line (matching terminal shell behavior).
  * **Input Clearing & Focus Shift on `/join`**: Guaranteed input field clears on submit for `/join #k` and shifts active focus to the target channel.

## v0.5.32-alpha (Light Mode Rank Contrast, Nick Change Symbol Parsing & Channel Messaging Fix)
* **Bug Fix (React Client UI)**
  * **Light Theme High-Contrast Rank Colors**: Added dark contrast rank colors in [client/src/index.css](file:///c:/Users/Eran/IRC/client/src/index.css#L134) (`.op`: `#00802b`, `.protected`: `#cc0044`, `.halfop`: `#008b8b`, `.voice`: `#b8860b`) for light mode, eliminating unreadable neon green/cyan text.
  * **Nick Change Symbol Parsing Fix**: Fixed regex in `App.tsx` `NICK` event handler. Preserves optional rank symbols (`*`, `@`, `%`, `+`) and replaces ONLY the nickname portion, preventing unranked nicks like `Guest383` from prepending first-letter artifacts (`GX`/`GK`) upon nick change.
  * **Channel Membership Send Sync**: Automatically seeded initial default channels (`#enterprise`, `#devops`) into `joinedChannelsRef` on connection in `App.tsx`, resolving channel message sending blocks.

## v0.5.31-alpha (Infinite Auto-Reconnect Retries & Keepalive Ping)
* **Bug Fix & Reliability (WebSocket Service)**
  * **Infinite Auto-Reconnect Retries**: Fixed `scheduleReconnect()` in [client/src/services/websocket.ts](file:///c:/Users/Eran/IRC/client/src/services/websocket.ts#L80) to reset timer references on execution, ensuring continuous automatic reconnection attempts every 3s during container rollouts.
  * **25-Second Keepalive PING**: Added a periodic 25-second `PING :keepalive` loop to `WebSocketService`, preventing cloud load balancers and intermediate proxies from timing out idle WebSocket connections.

## v0.5.30-alpha (User List Rank Symbol Sanitization)
* **Bug Fix (React Client UI)**
  * **User List Rank Symbol Deduplication**: Updated `JOIN` and `PART` handlers in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L145) to strip rank symbols (`*`, `@`, `%`, `+`) before comparing nicknames. Prevents duplicate unranked entries when users join or change modes.

## v0.5.29-alpha (+q Protected Permission Enforcement, 353 Rank Sync Fix & /rejoin Command)
* **Feature & Bug Fix (Go Daemon & React Client)**
  * **Strict `+q` (Protect) Permission Check**: Go IRCd `router.go` now requires `*@` (Protected) status to execute `/mode #channel +q nick` or `/mode #channel -q nick`. Non-protected Operators receive error `482` (`Only protected users (*@) can grant or revoke +q`).
  * **Channel Operator Rank Sync Fix**: Corrected regex in `App.tsx` parsing `353` RPL_NAMREPLY (`/ 353 [^ ]+ [=@*] ([#][^ ]+) :(.*)$/`). This fixes rank badge persistence so the first user in a channel retains `@` Operator rank when subsequent users join.
  * **`/rejoin` Slash Command**: Added `/rejoin` (or `/rejoin #channel`) command to cleanly part and re-enter the active channel target.
  * **Window Focus Shift on `/join`**: Guaranteed active target window shifts immediately to the joined channel upon `/join #channel`.

## v0.5.28-alpha (Kicked Rejoin & Messaging, Query Windows, Nick Header & Context Menu Bounds)
* **Bug Fix (React Client & Go Daemon)**
  * **Kicked Rejoin Fix**: Removed channel from `joinedChannelsRef` set upon `KICK` so users can immediately `/join #channel` back.
  * **Non-Member Message Block**: Enforced membership checks in both client (`App.tsx`) and Go daemon (`router.go` `404`), displaying system notice `* You cannot send messages to #channel because you are not in that channel` when attempting to speak after being kicked.
  * **Matching Rank Colors**: Styled nickname text to match their respective badge rank color (`protected` magenta, `op` emerald green, `halfop` cyan, `voice` gold).
  * **Sidebar User Card Header**: Added dynamic user card badge above Status Window showing current nickname (`USER: Guest100`).
  * **`/me` Single Broadcast**: Eliminated optimistic duplication for `/me` CTCP actions.
  * **Auto Shift Window on Join**: Automatically shifts active focus to newly joined channels upon `/join`.
  * **Private Message Query Popups**: Private messages automatically create a 1-on-1 query window in sidebar for both sender and recipient.
  * **Channel Join Rank Sync**: Daemon broadcasts `353` RPL_NAMREPLY to all channel members upon join so `@`/`+` ranks update instantly.
  * **Context Menu Boundary Clamping**: Clamped context menu coordinates inside viewport, preventing clipping at screen edges.

## v0.5.27-alpha (Go Compilation Build Fix)
* **Bug Fix (Go Daemon Build)**
  * Added missing `"strings"` package import to [services/ircd/internal/server/manager.go](file:///c:/Users/Eran/IRC/services/ircd/internal/server/manager.go#L4).
  * Added `Host()` method receiver to `Client` struct in [services/ircd/internal/server/client.go](file:///c:/Users/Eran/IRC/services/ircd/internal/server/client.go#L57) and updated method call in `router.go`.

## v0.5.26-alpha (Alt + 0..9 Window Switching Keyboard Shortcuts)
* **Feature (React Web Client UI)**
  * **Window Switching Shortcuts**:
    * `Alt + 0`: Immediately switches active focus to the **Status Window**.
    * `Alt + 1` through `Alt + 9`: Switches active focus to the 1st through 9th joined channel target.
  * **Sidebar Shortcut Badges**: Added visual `Alt+0`, `Alt+1`.. `Alt+9` shortcut badges in [client/src/components/Sidebar.tsx](file:///c:/Users/Eran/IRC/client/src/components/Sidebar.tsx#L27) for mIRC-style quick navigation.

## v0.5.25-alpha (Strict Rank Combat Hierarchy, Protected Shields & mIRC User List Context Menu)
* **Feature (Go IRCd Daemon & User Combat Governance)**
  * **Strict Rank Hierarchy**: Supported modes `+q` (Protected `*`), `+o` (Op `@`), `+h` (Half-Op `%`), `+v` (Voice `+`), and Unranked.
  * **Protected User Kick Defense (`484`)**: Protected users (`*`) CANNOT be kicked by anyone unless the kicker also possesses Protected status (`*`). Non-protected Operators attempting to kick a Protected user receive IRC error `484` (`Cannot kick protected user (*)`).
  * **Half-Op Ejection Limits**: Half-Ops (`%`) can only kick Voiced (`+`) and unranked users. Attempting to kick Half-Ops or Ops returns error `482`.
* **Feature (React Web Client UI)**
  * **Strict Hierarchy Nicklist Sorting**: User list sorts users strictly by power (`*` > `@` > `%` > `+` > unranked), then alphabetically by nickname.
  * **Visual Rank Stacking**: Displays single highest rank badge symbol for users with multiple ranks (e.g. `*@` renders as `*`).
  * **Double-Click Query**: Double-clicking (or left-clicking) a nickname in the User List opens a 1-on-1 private messaging query window.
  * **Right-Click mIRC Context Menu**: Right-clicking a user opens a dynamic dropdown menu with Whois, Query, Op/DeOp (`+o`/`-o`), Voice/DeVoice (`+v`/`-v`), HalfOp/DeHalfOp (`+h`/`-h`), Protect/DeProtect (`+q`/`-q`), Kick, Ban (`+b`), and KickBan options.

## v0.5.24-alpha (Channel Operator Governance, Channel Modes & Screen Reader Formatting)
* **Feature (Go IRCd Daemon & Web Client)**
  * **Operator (@) Creation**: First user joining an ephemeral channel automatically receives Channel Operator status (`@`).
  * **Moderation Commands**:
    * `/KICK [#channel] <nick> [reason]` - Forcibly ejects user from channel.
    * `/TOPIC [#channel] [new_topic]` - Gets or updates channel banner topic (enforces `+t` Op lock).
    * `/INVITE <nick> [#channel]` - Sends channel invitation (bypasses `+i` invite-only restriction).
    * `/NOTICE <target> <message>` - Sends urgent alert/notice, rendered as `-Sender- Message`.
  * **Channel Modes (`/MODE`)**:
    * Privileges: `+o`/`-o` (Op `@`), `+v`/`-v` (Voice `+`), `+b`/`-b` (Ban mask).
    * Channel Rules: `+m` (Moderated: Ops & Voiced only speak), `+i` (Invite-Only), `+k` (Password Key), `+s` (Secret), `+n` (No external msgs), `+l` (User count limit), `+t` (Topic Lock).

## v0.5.23-alpha (Full Basic IRC User Commands Implementation)
* **Feature (Go IRCd Daemon & Web Client)**
  * Implemented `/NICK [new_nickname]` - Changes display name on the network.
  * Implemented `/JOIN [#channel] [password]` - Joins specified channel.
  * Implemented `/PART [#channel] [message]` - Leaves channel with optional reason.
  * Implemented `/WHOIS [nickname]` - Returns user metadata (`311` RPL_WHOISUSER, `319` RPL_WHOISCHANNELS, `312` RPL_WHOISSERVER, `318` RPL_ENDOFWHOIS).
  * Implemented `/MSG [nickname] [message]` (or `/PRIVMSG`) - Direct private messaging.
  * Implemented `/ME [action]` - CTCP action roleplay messages (`* Nick waves to everyone`).
  * Implemented `/LIST [search_term]` - Queries network channel directory (`321` RPL_LISTSTART, `322` RPL_LIST, `323` RPL_LISTEND).
  * Implemented `/QUIT [message]` - Gracefully disconnects with optional parting reason.

## v0.5.22-alpha (Clean Status Window Numerics & Topic Parsing)
* **Bug Fix (React Client UI)**
  * Parsed IRC numeric `332` (RPL_TOPIC) in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L183) to dynamically update the active channel header topic without polluting the Status Window.
  * Ignored IRC numeric `366` (RPL_ENDOFNAMES) to eliminate raw `/NAMES` list end lines.
  * Stripped raw IRC protocol prefixes (`:server.name 001 nick :`) from welcome banners and notices, rendering clean, human-readable system messages in the Status Window.

## v0.5.21-alpha (RFC 1459 Channel Case Insensitivity & Deduplicated Channel Joins)
* **Bug Fix (Daemon & Ingress)**
  * Normalized all channel names to lowercase (`strings.ToLower`) in [services/ircd/internal/server/router.go](file:///c:/Users/Eran/IRC/services/ircd/internal/server/router.go#L101) and [services/ircd/internal/server/manager.go](file:///c:/Users/Eran/IRC/services/ircd/internal/server/manager.go#L32).
  * Fixed channel mismatch between Valkey Pub/Sub listener (`#king`) and Go daemon channel registry (`#KING`), restoring real-time messaging across all uppercase/lowercase channel names (`#P`, `#KING`, `#X`).
* **Bug Fix (React Client UI)**
  * Normalized all channel state lookup keys and targets to lowercase in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L53).
  * Added `joinedChannelsRef` set in `App.tsx` to prevent redundant `JOIN` commands and duplicate join lines when clicking existing channel tabs or re-running `/join #channel`.

## v0.5.20-alpha (Backend Single-Delivery Broadcast & Multi-Channel Server Join Sync)
* **Bug Fix (Daemon Backend)**
  * Fixed dual-broadcast bug in [services/ircd/internal/server/router.go](file:///c:/Users/Eran/IRC/services/ircd/internal/server/router.go#L161). Channel messages now route exclusively through Valkey Pub/Sub single-delivery broadcast, eliminating duplicate messages for all recipients.
* **Bug Fix (Multi-Channel Sync)**
  * Updated `connectWebSocket` and `handleSelectTarget` in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L202) to automatically register `JOIN` commands on the server for all channels (`#enterprise`, `#devops`, `#k`), ensuring messages in secondary channels reach all users.
  * Formatted real-time `* x has joined #channel` system notifications cleanly while populating side user lists directly from server `353` (RPL_NAMREPLY).

## v0.5.19-alpha (Duplicate Message Resolution, 16px Fira Code Defaults & Dedicated Font Size Dropdown)
* **Bug Fix (Messaging)**
  * Eliminated duplicate message rendering in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L255). PRIVMSG lines are now handled once when broadcast back by the server, ensuring zero duplicates and 100% nickname consistency across all open tabs.
* **UI & Typography**
  * Configured **16px font size** (`large`) and **Fira Code font family** as defaults in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L17).
  * Added a dedicated `Font: 16px ▾` dropdown button directly to [client/src/components/TopMenuBar.tsx](file:///c:/Users/Eran/IRC/client/src/components/TopMenuBar.tsx#L58) with 1-click selection for `12px`, `14px`, `16px (Default)`, `18px`, and `20px`.

## v0.5.18-alpha (Top Menu Bar Dropdown UX Fix)
* **Bug Fix (UI/UX)**
  * Replaced premature `onMouseLeave` handlers in [client/src/components/TopMenuBar.tsx](file:///c:/Users/Eran/IRC/client/src/components/TopMenuBar.tsx#L27) with a global click-outside event listener (`useRef` + `mousedown`).
  * Resolves issue where dropdown menus (Font Size, Font Family, Theme, File options) vanished rapidly when trying to hover or select options.

## v0.5.17-alpha (Kubernetes Service Port 9090 Fix, RFC 1459 Live User Sync & Light Mode Default)
* **Bug Fix (Networking & Infrastructure)**
  * Added port 9090 to [services/ircd/deploy/service.yaml](file:///c:/Users/Eran/IRC/services/ircd/deploy/service.yaml#L11). Resolves WebSocket connection refusal between `ircd-web-client` proxy and `ircd` pod, restoring live multi-user messaging, status online indicator, and active client metric tracking.
* **Frontend & RFC 1459 State**
  * Set **Classic Light Mode** (gray panels, black nicks) as the default initial theme in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L17).
  * Implemented full RFC 1459 event handling in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L64) for `353` (RPL_NAMREPLY), `JOIN`, `PART`, `QUIT`, and `NICK` for real-time user list synchronization and `/nick` changes.
  * Eliminated double `#` formatting in [client/src/components/Sidebar.tsx](file:///c:/Users/Eran/IRC/client/src/components/Sidebar.tsx#L40) and [client/src/components/ChatArea.tsx](file:///c:/Users/Eran/IRC/client/src/components/ChatArea.tsx#L30).

## v0.5.16-alpha (WebSocket Auto-Reconnect, Classic Theme Polish, RTL Left-Alignment & Pod Metric Fix)
* **Bug Fix (Backend & Observability)**
  * Fixed WebSocket connection URL in [client/src/App.tsx](file:///c:/Users/Eran/IRC/client/src/App.tsx#L101) to use `${protocol}//${window.location.host}/ws` via Nginx/Traefik Ingress. Resolves client DISCONNECTED state, connects live tabs, and restores live active client graph metrics.
  * Updated `IRCd Pod Status` PromQL query in [services/ircd/deploy/dashboard-master.yaml](file:///c:/Users/Eran/IRC/services/ircd/deploy/dashboard-master.yaml#L37) to exclude `ircd-web-client`, accurately showing 1 running IRCd pod in the test environment.
* **UI & Themes**
  * Added 1-click **Dark Mode Toggle Button** in [client/src/components/TopMenuBar.tsx](file:///c:/Users/Eran/IRC/client/src/components/TopMenuBar.tsx#L35) for instant switching between Classic Light (gray panels, black nicks, green/blue events) and Dark Mode.
  * Updated [client/src/components/ChatArea.tsx](file:///c:/Users/Eran/IRC/client/src/components/ChatArea.tsx#L65) to keep message lines strictly aligned to the left margin regardless of RTL Hebrew text.
  * Updated branding to **Enterprise IRC**.

## v0.5.15-alpha (Nginx Alias 500 Error Resolution & Clean Traefik Routing)
* **Bug Fix (Ingress & Web Client)**
  * Fixed Nginx 500 Internal Server Error cycle by removing invalid `alias` / `try_files` combination from [client/nginx.conf](file:///c:/Users/Eran/IRC/client/nginx.conf#L8).
  * Cleaned up Traefik Ingress annotations in [services/ircd/deploy/client-deployment.yaml](file:///c:/Users/Eran/IRC/services/ircd/deploy/client-deployment.yaml#L50) and [infrastructure/monitoring/kube-prometheus-stack.yaml](file:///c:/Users/Eran/IRC/infrastructure/monitoring/kube-prometheus-stack.yaml#L49), restoring clean HTTP & HTTPS routing for `/`, `/test`, and `/monitoring-test`.

## v0.5.14-alpha (HTTPS 443 Redirect, Subpath Ingress Routing & Web Client SPA Asset Fix)
* **Architecture & UI Fix**
  * Updated [client/vite.config.ts](file:///c:/Users/Eran/IRC/client/vite.config.ts#L6) with `base: './'` to fix the **white blank screen issue** caused by absolute asset resolution failing under subpaths.
  * Updated [client/nginx.conf](file:///c:/Users/Eran/IRC/client/nginx.conf#L8) to handle SPA routing under `/test` subpaths natively.
  * Configured HTTP -> HTTPS (443) automated redirect annotations in [services/ircd/deploy/client-deployment.yaml](file:///c:/Users/Eran/IRC/services/ircd/deploy/client-deployment.yaml#L50) and [infrastructure/monitoring/kube-prometheus-stack.yaml](file:///c:/Users/Eran/IRC/infrastructure/monitoring/kube-prometheus-stack.yaml#L46).
  * Re-routed Grafana monitoring dashboards to `/monitoring-test` (and `/monitoring-prod`), freeing `/` for the main production landing page placeholder and `/test` for the test web client.

## v0.5.13-alpha (Web Client Container Image Pull & GitOps Sync Fix)
* **Bug Fix (DevOps)**
  * Updated `image` path in [services/ircd/deploy/client-deployment.yaml](file:///c:/Users/Eran/IRC/services/ircd/deploy/client-deployment.yaml#L20) to `ghcr.io/eran-meir/irc/client:latest` matching the GHCR repository tag format.
  * Resolves `ImagePullBackOff` error on the `ircd-web-client` pod caused by unmatched regex during CI/CD GitOps tag updates.

## v0.5.12-alpha (RFC 1459 Smoke Test Handshake Fix)
* **Bug Fix (CI/CD)**
  * Updated inline Python smoke test in [3-deploy-and-test-app.yml](file:///c:/Users/Eran/IRC/.github/workflows/3-deploy-and-test-app.yml#L179) to send `NICK` + `USER` registration commands before waiting for the server `001 Welcome` reply.
  * The IRCd correctly follows RFC 1459 protocol (server waits for client registration), but the old test passively waited for a banner on raw TCP connect, causing immediate timeout and connection drop.

## v0.5.11-alpha (GHA Docker Layer Cache Bust for Web Client Build)
* **Bug Fix (DevOps)**
  * Added `no-cache: true` to the `Build and Push Web Client (ARM64)` step in [3-deploy-and-test-app.yml](file:///c:/Users/Eran/IRC/.github/workflows/3-deploy-and-test-app.yml#L56).
  * The GHA layer cache was serving a stale `package.json` with the old `tsc && vite build` script, causing `tsc --help` exit code 1 despite code changes being pushed.
  * Cache will be re-populated cleanly after the first successful build.

## v0.5.10-alpha (Vite Native Production Bundling Fix)
* **Build Optimization**
  * Updated [client/package.json](file:///c:/Users/Eran/IRC/client/package.json#L8) build script to `"build": "vite build"`.
  * Utilizes Vite's native internal `esbuild` compiler to bundle static React + TS/TSX assets directly without calling external `tsc` binary during Docker container compilation.

## v0.5.9-alpha (Explicit tsconfig Path Target for TypeScript Build)
* **Bug Fix**
  * Updated [client/package.json](file:///c:/Users/Eran/IRC/client/package.json#L8) build script to `tsc -p ./tsconfig.json && vite build`.
  * Explicitly passes `-p ./tsconfig.json` to `tsc` compiler so it targets the configuration file directly during Docker container build.

## v0.5.8-alpha (React Web Client Missing tsconfig.json Fix)
* **Bug Fix**
  * Created [client/tsconfig.json](file:///c:/Users/Eran/IRC/client/tsconfig.json) with ES2020 target, DOM types, bundler module resolution, and React JSX options.
  * Resolves TypeScript compiler (`tsc`) build failure during Docker multi-stage image build stage (`[builder 6/6] RUN npm run build`) where `tsc` printed `--help` text and exited with exit code 1.

## v0.5.7-alpha (QEMU Core Dump Elimination via Native BuildPlatform Compilation)
* **DevOps & Build Optimization**
  * Updated [client/Dockerfile](file:///c:/Users/Eran/IRC/client/Dockerfile#L2) builder stage to use `FROM --platform=$BUILDPLATFORM node:20-alpine AS builder`.
  * Eliminates QEMU ARM64 user-mode JIT emulation crash (`signal 4 core dumped`) by compiling static HTML/JS/CSS assets natively on GitHub Action's x86_64 host runner at 10x speed (`commit 8d44f57`).

## v0.5.6-alpha (Web Client Docker Builder Package Installation Fix)
* **Bug Fix**
  * Updated [client/Dockerfile](file:///c:/Users/Eran/IRC/client/Dockerfile#L5) builder stage to use `RUN npm install` instead of `npm ci`, resolving Node build container failure (`commit 06d92a3`).

## v0.5.5-alpha (Go Compiler Return Signature Alignment Fix)
* **Bug Fix**
  * Updated [cmd/ircd/main.go](file:///c:/Users/Eran/IRC/services/ircd/cmd/ircd/main.go#L34) to check single return value `ch := GetOrCreateChannel(...)` matching Rule 10 API contract, resolving Go build error (`commit 0126545`).

## v0.5.4-alpha (Governance Cleanup & 13-Rule Code Review Engine)
* **Governance & Cleanup**
  * Removed duplicate `.agents/AGENTS.md` file (`commit 49f4e47`), keeping `AI_RULES.md` as the single source of truth.
  * Updated `.agents/skills/code-review/SKILL.md` to enforce evaluating all 13 rules systematically during every code review.

## v0.5.3-alpha (Rule 3 Strict Cloud Execution Policy)
* **Governance & Rules**
  * Updated **Rule 3** in `AI_RULES.md` and added `.agents/AGENTS.md` explicitly mandating that zero application code (Go, Docker, Python, React Web Client) is built or executed locally on the user's laptop.
  * Codified that the local environment is strictly an editing workspace, and all compilation, builds, and runtime executions occur exclusively in the cloud (GitHub Actions CI/CD and Oracle Cloud K3s cluster).

## v0.5.2-alpha (Go Compiler Strict Import Compliance Fix)
* **Bug Fix**
  * Removed unused `"fmt"` import from `services/ircd/internal/server/channel.go`, resolving Go compiler build failure in Docker multi-stage pipeline (`commit a5565d7`).

## v0.5.1-alpha (Test Environment Ingress Routing & Multi-Stage Web Client Container)
* **DevOps & Routing Architecture**
  * Configured Grafana test monitoring service to listen on port `3001` (`http://<SERVER_IP>:3001`).
  * Created multi-stage `client/Dockerfile` (Node 20 Vite builder + ultra-slim Nginx runtime).
  * Created Traefik Ingress routing `http://<SERVER_IP>/test` directly to the `ircd-web-client` container with SPA fallback.
  * Configured Nginx WebSocket proxy forwarding `/ws` traffic to `ircd.default.svc.cluster.local:9090`.

## v0.5.0-alpha (Core IRC Messaging, Valkey Pub/Sub & mIRC React Web Client)
* **IRCd Engine Features**
  * Implemented RFC 1459 command router (`NICK`, `USER`, `JOIN`, `PART`, `PRIVMSG`, `PING`, `PONG`, `QUIT`).
  * Integrated Valkey Pub/Sub state backend for real-time cross-pod message broadcasting (`irc:channel:*`).
  * Built a pure Go RFC 6455 WebSocket upgrader (`/ws`) allowing web browsers to connect to IRCd without third-party dependencies.
* **Frontend Web Client (`client/`)**
  * Created modern mIRC-inspired React + TypeScript Web Client with `"Fixedsys"` font and dark mode glassmorphism themes.
  * Integrated English UI with Hebrew character reading support (auto-RTL text alignment for Hebrew messages).
  * Added top "View & Preferences" menu bar with customizable font size, font family, theme switcher, and nick list toggles.

## v0.4.4-alpha (Full Codebase Review & GitOps Documentation Architecture)
* **Documentation & Architecture**
  * Completed full codebase and infrastructure review using the `code-review` skill audit methodology.
  * Enhanced `README.md` with an extensive Enterprise GitOps & High-Performance Deployment Architecture section.
  * Documented multi-stage Docker build optimizations, declarative ArgoCD/Helm GitOps syncs, automated GHCR image pruning (4 tags max), and S3 state backups.

## v0.4.3-alpha (Prometheus Resource Headroom & OOM Prevention)
* **DevOps & Stability**
  * Increased Prometheus memory limit to `768Mi` in `kube-prometheus-stack.yaml` to prevent OOMKilled pod crashes during TSDB WAL compaction.
  * Optimized global cluster `scrapeInterval` to `15s` while preserving `5s` high-resolution scraping in `podmonitor.yaml` specifically for IRCd.

## v0.4.2-alpha (PromQL Metric Aggregation Fix for Active Connections)
* **DevOps & Dashboard Fix**
  * Updated PromQL target query in `dashboard-master.yaml` and `dashboard-app.yaml` to `sum(ircd_connected_clients) or vector(0)`.
  * Aggregates multi-instance Prometheus series into a single scalar value, resolving Grafana stat panel column splitting (`0 0 50`) into one clean unified count.

## v0.4.1-alpha (High-Resolution 5s Metric Scraping & PodMonitor)
* **DevOps & Metric Discovery**
  * Created `services/ircd/deploy/podmonitor.yaml` (`PodMonitor` Custom Resource) to instruct Prometheus Operator to scrape `:9090/metrics` directly from `ircd` pods.
  * Configured high-resolution `scrapeInterval: 5s` in `kube-prometheus-stack.yaml` to capture short-lived load spikes and sub-minute connection bursts.
  * Set `podMonitorSelectorNilUsesHelmValues: false` so Prometheus Operator automatically discovers application monitors without label constraint blocks.

## v0.4.0-alpha (Native IRCd Prometheus Metrics & Connection Tracking)
* **Application Metrics & Observability**
  * Added native Prometheus Exposition HTTP server (`:9090/metrics`) inside `services/ircd/internal/metrics/metrics.go` with zero external dependencies.
  * Implemented `ircd_connected_clients` gauge tracking active IRC client TCP sockets in real time (increments on connect, decrements on disconnect).
  * Implemented `ircd_messages_total` counter tracking processed IRC protocol messages.
  * Updated Grafana panels to display `ircd_connected_clients`, reading exact client counts (`0` when idle, `50` during stress test, `0` post-test).

## v0.3.1-alpha (Grafana Dashboard Units & Unified Master Grid)
* **DevOps & Dashboard Polish**
  * Added human-readable Grafana unit formatting (`decbytes`, `Bps`, `percent`, `short`) across all dashboard panels, converting raw bytes into clean MB/GB and Bps into KB/s.
  * Replaced static pod count metrics in TCP connection panels with live established socket metric `sum(node_netstat_Tcp_CurrEstab)`.
  * Unified the Master System Overview dashboard (`dashboard-master.yaml`) to show Server Node CPU/Memory/Load, App CPU/Memory, Valkey RAM, Network Bandwidth, and Loki chat logs in a single grid layout.

## v0.3.0-alpha (Automated High-Concurrency Stress Testing Suite)
* **DevOps & Testing**
  * Built dedicated load generator script `scripts/stress_test.py` utilizing Python `asyncio` to manage 50+ concurrent TCP connections.
  * Created dedicated manual workflow `.github/workflows/5-stress-test-test-env.yml` (`5. Stress Test - Test Environment`).
  * Configured automatic GitHub Step Summary markdown table output detailing total inbound messages, message throughput rates, and outbound fan-out reads.

## v0.2.2-alpha (Observability Datasource & True GitOps Alignment)
* **DevOps & Observability**
  * Configured explicit Prometheus datasource UID and bindings across all Grafana dashboards (`dashboard-master.yaml`, `dashboard-server.yaml`, `dashboard-app.yaml`).
  * Aligned monitoring stack with Rule 11 (True GitOps Architecture), removing brittle inline `kubectl patch` SSH string manipulations from `3-deploy-and-test-app.yml`.
  * Configured standard `kube-prometheus-stack` Helm wiring for native Grafana-Prometheus cluster DNS service discovery (`http://kube-prometheus-stack-prometheus.monitoring:9090`).

## v0.2.1-alpha (Security Audit & CI/CD Hardening)
* **Security & Compliance**
  * Performed security audit to ensure 100% compliance with Rule 5 (Strict Confidentiality).
  * Added root `.gitignore` to prevent sensitive credentials (`*.pem`, `*.key`, `deploy_key`, `*.tfstate`) from ever being committed.
  * Extracted hardcoded Grafana admin credentials in `kube-prometheus-stack.yaml` to Kubernetes `adminExistingSecret`.
* **DevOps & CI/CD**
  * Upgraded all GitHub Actions (`checkout`, `setup-terraform`, `docker/*`, `artifact/*`, `ghcr-prune`) to modern major versions targeting Node 24.
  * Added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` to eliminate all runtime deprecation warnings.
  * Resolved Oracle Cloud Ubuntu `iptables FORWARD` chain REJECT rule in `cloud-init.yaml`.
  * Added robust connection retry loop and multi-keyword banner matching in integration smoke test (`test.py`).

## v0.2.0-alpha (Observability & Monitoring Stack)
* **Infrastructure Focus**
* Deployed `kube-prometheus-stack` (Grafana & Prometheus) via ArgoCD GitOps, strictly tuned for memory efficiency and exposed via Port 3000 LoadBalancer.
* Deployed `loki-stack` (Loki & Promtail) via ArgoCD with strict 5GB storage limit and 7-day retention period.
* Updated `cloud-init.yaml` to securely open monitoring ports and automatically bootstrap observability manifests on cluster creation.
* Created custom GitOps `ConfigMap` for Grafana to dynamically provision a bespoke IRC daemon monitoring dashboard (CPU, Memory, Network Traffic, and Live Loki Chat Logs).


## v0.1.2-alpha (GitOps Verification Test)
* **DevOps Focus**
* Updated IRCd connection welcome banner to `[Build Version Y (GitOps Verified)]` to strictly test and verify end-to-end continuous deployment via ArgoCD.


## v0.1.1-alpha (GitOps Migration)
* **DevOps & Architecture Correction**
* Migrated completely away from fragile `scp`/`ssh` deployment scripts.
* Implemented true GitOps deployment architecture using **ArgoCD**.
* Updated Terraform `cloud-init.yaml` to natively bootstrap ArgoCD upon cluster creation.
* Fixed critical port collision bug (`IRCD_PORT` vs Kubernetes injected variables).
* Removed hardcoded `imagePullSecrets` manifest configuration to enable seamless anonymous pulls for public GHCR packages.
* Implemented automated GitHub Container Registry (GHCR) pruning workflow to retain only 4 images, strictly adhering to $0 resource limits.
* Established unified `docs/ARCHITECTURE.md` as the single source of truth.

## v0.1.0-alpha (Current)
* **DevOps Focus**
* Implemented raw TCP Socket Connection Manager.
* Integrated Valkey state adapter for Pub/Sub capability.
* Built RFC 1459-compliant IRC Message Parser engine (No Regex).
* Created dedicated CLI test client (`cmd/client/main.go`).
* Stabilized 100% automated CI/CD pipeline deploying directly to K3s cluster.
