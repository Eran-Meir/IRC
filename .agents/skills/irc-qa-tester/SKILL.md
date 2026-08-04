---
name: irc-qa-tester
description: Lead QA Automation Engineer for E2E socket & protocol validation of the Go IRCd server and React client. Triggers when running test suites, verifying command compliance, auditing RFC 1459/2812 edge cases, or generating test execution matrix logs.
---

# IRC QA Automation & E2E Protocol Testing Skill

## Purpose & Scope
This skill governs all automated E2E testing, protocol compliance verification, and multi-client socket simulation for the IRCd server (`services/ircd`) and Web Client (`client`). It provides a standardized Python testing suite to execute real-time multi-session scenarios and print structured PASS/FAIL result matrices.

---

## Core Engineering Rules & Testing Principles

### 1. Multi-Client Socket Simulation
- Tests must spawn isolated raw TCP/WebSocket socket connections representing distinct users (`Client_A`, `Client_B`, `Client_Admin`).
- Verify cross-session state: state must persist across sessions, and permissions must be strictly enforced.
- Example: If a user is kicked from `#channel`, they MUST receive the `KICK` frame, lose channel membership, and fail sending messages (`404 ERR_CANNOTSENDTOCHAN`) until they issue `JOIN` again.

### 2. Strict RFC 1459/2812 & Rank Hierarchy Validation
Every scenario must assert raw server response lines and numeric codes:
- **NICK**: Verify nickname change notice (`:OldNick NICK :NewNick`) broadcasts to shared channels.
- **PRIVMSG & NOTICE**: Verify direct messages (`:Sender PRIVMSG Target :Text`) arrive with zero duplicates.
- **WHOIS**: Assert `311` (RPL_WHOISUSER) and `318` (RPL_ENDOFWHOIS).
- **JOIN**: First user joining an uncreated channel gains `@` Operator rank (`353` RPL_NAMREPLY contains `@Nick`), receives `332` (RPL_TOPIC), and `366` (RPL_ENDOFNAMES).
- **TOPIC**: Setting a topic requires `@` Operator rank. Topic is sent to joining users (`332`) and discarded when all users leave the channel.
- **KICK**: Op removes lower user; kicked user receives `KICK` notice and gets blocked from sending (`404`).
- **BAN (+b)**: Banned mask blocks re-entry (`474 ERR_BANNEDFROMCHAN`).
- **RANK HIERARCHY**: `+v` (Voice) cannot kick anyone (`482 ERR_CHANOPRIVSNEEDED`); `@` (Op) cannot kick `*` (`+q` Protected).
- **OPER / KLINE / REHASH**: Administrative commands require `OPER` authentication (`381 RPL_YOUREOPER`), `KLINE` severs target connection, `REHASH` returns `382 RPL_REHASHING`.

### 3. Structured Test Matrix Output
At the conclusion of every test run, print a human-readable summary matrix:
```text
======================================================================
                     IRC QA TEST SUITE RUN RESULTS                     
======================================================================
COMMAND               TEST SCENARIO                      STATUS  
----------------------------------------------------------------------
NICK                  Nickname Change & Broadcast        PASS    
PRIVMSG & NOTICE      Private Message & Formatting       PASS    
WHOIS                 User Info Query (311/318)          PASS    
JOIN                  First Join -> Op (@) Assigned     PASS    
TOPIC                 Op Topic Setting & Discard         PASS    
KICK                  Op Kicks User -> Msg Blocked       PASS    
BAN (+b)              Banned Mask Blocks Re-Entry        PASS    
RANK HIERARCHY        +v Blocked Kick; +q Protected      PASS    
REJOIN                Part + Join Broadcast Sync         PASS    
KLINE                 IRCop Severs Target Socket         PASS    
REHASH                Admin Reloads Config (382)         PASS    
======================================================================
TOTAL: 11 Passed | 0 Failed | 0 Skipped
```

---

## Test Execution Script

The core test runner script is located at `scripts/test_runner.py`. To execute the E2E QA suite:
```bash
python .agents/skills/irc-qa-tester/scripts/test_runner.py --host <SERVER_IP> --port 6667
```
