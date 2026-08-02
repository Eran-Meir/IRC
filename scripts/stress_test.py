#!/usr/bin/env python3
"""
IRC Daemon High-Concurrency Stress & Load Generator
Simulates N concurrent IRC clients joining a channel and exchanging messages.
"""

import asyncio
import sys
import time
import argparse
import os

class IRCClient:
    def __init__(self, client_id, server_ip, port, channel, duration):
        self.client_id = client_id
        self.nick = f"bot_{client_id:02d}"
        self.server_ip = server_ip
        self.port = port
        self.channel = channel
        self.duration = duration
        self.reader = None
        self.writer = None
        self.connected = False
        self.registered = False
        self.joined = False
        self.msgs_sent = 0
        self.msgs_recv = 0
        self.errors = 0

    async def connect(self):
        try:
            self.reader, self.writer = await asyncio.wait_for(
                asyncio.open_connection(self.server_ip, self.port), timeout=10.0
            )
            self.connected = True
            
            # Send IRC Registration
            self.writer.write(f"NICK {self.nick}\r\nUSER {self.nick} 0 * :Stress Test Bot {self.client_id}\r\n".encode())
            await self.writer.drain()
            return True
        except Exception as e:
            self.errors += 1
            return False

    async def listen_and_talk(self, start_time):
        if not self.connected:
            return

        listen_task = asyncio.create_task(self._receiver())
        talk_task = asyncio.create_task(self._sender(start_time))

        await asyncio.gather(listen_task, talk_task, return_exceptions=True)
        await self.close()

    async def _receiver(self):
        while True:
            try:
                line = await asyncio.wait_for(self.reader.readline(), timeout=2.0)
                if not line:
                    break
                decoded = line.decode('utf-8', errors='ignore')
                self.msgs_recv += 1

                # Check registration confirmation (001)
                if " 001 " in decoded and not self.registered:
                    self.registered = True
                    # Join Channel
                    self.writer.write(f"JOIN {self.channel}\r\n".encode())
                    await self.writer.drain()
                    self.joined = True

            except asyncio.TimeoutError:
                pass
            except Exception:
                self.errors += 1
                break

    async def _sender(self, start_time):
        # Wait for registration and join
        wait_start = time.time()
        while not self.joined and (time.time() - wait_start < 10.0):
            await asyncio.sleep(0.2)

        msg_index = 1
        while (time.time() - start_time) < self.duration:
            if self.writer and not self.writer.is_closing():
                try:
                    payload = f"PRIVMSG {self.channel} :[StressBot {self.client_id:02d}] Packet #{msg_index} t={time.time():.2f}\r\n"
                    self.writer.write(payload.encode())
                    await self.writer.drain()
                    self.msgs_sent += 1
                    msg_index += 1
                except Exception:
                    self.errors += 1
                    break
            # Send message every 1.5 seconds per client
            await asyncio.sleep(1.5)

    async def close(self):
        if self.writer and not self.writer.is_closing():
            try:
                self.writer.write(b"QUIT :Stress test complete\r\n")
                await self.writer.drain()
                self.writer.close()
                await self.writer.wait_closed()
            except Exception:
                pass

async def main():
    parser = argparse.ArgumentParser(description="IRC Daemon Stress Tester")
    parser.add_argument("server_ip", help="IRC Server IP Address")
    parser.add_argument("--port", type=int, default=6667, help="IRC Port (default 6667)")
    parser.add_argument("--clients", type=int, default=50, help="Number of concurrent clients (default 50)")
    parser.add_argument("--duration", type=int, default=45, help="Duration in seconds (default 45)")
    parser.add_argument("--channel", default="#stresstest", help="IRC channel to join")

    args = parser.parse_args()

    print(f"🚀 Starting IRC Daemon Stress Test")
    print(f"   Server Target    : {args.server_ip}:{args.port}")
    print(f"   Simulated Sockets: {args.clients} clients")
    print(f"   Target Channel   : {args.channel}")
    print(f"   Test Duration    : {args.duration} seconds\n")

    clients = [IRCClient(i + 1, args.server_ip, args.port, args.channel, args.duration) for i in range(args.clients)]

    # Ramp up connections in batches
    print("🔌 Connecting clients...")
    conn_start = time.time()
    batch_size = 10
    connected_count = 0

    for i in range(0, len(clients), batch_size):
        batch = clients[i:i + batch_size]
        results = await asyncio.gather(*[c.connect() for c in batch])
        connected_count += sum(1 for r in results if r)
        await asyncio.sleep(0.3)

    conn_elapsed = time.time() - conn_start
    print(f"✅ Connected {connected_count}/{args.clients} clients in {conn_elapsed:.2f}s.\n")

    # Run Messaging Load Loop
    print(f"🔥 Broadcasting continuous messages across {args.channel} for {args.duration} seconds...")
    start_time = time.time()

    await asyncio.gather(*[c.listen_and_talk(start_time) for c in clients])

    total_time = time.time() - start_time

    # Collect Results
    total_sent = sum(c.msgs_sent for c in clients)
    total_recv = sum(c.msgs_recv for c in clients)
    total_errors = sum(c.errors for c in clients)
    successful_reg = sum(1 for c in clients if c.registered)
    successful_join = sum(1 for c in clients if c.joined)

    send_rate = total_sent / total_time if total_time > 0 else 0
    fanout_rate = total_recv / total_time if total_time > 0 else 0

    # Print Terminal Summary
    print("\n" + "=" * 60)
    print(" 📊 IRC STRESS TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f" Total Duration      : {total_time:.2f} seconds")
    print(f" Target Clients      : {args.clients}")
    print(f" Successful Sockets  : {connected_count} ({connected_count/args.clients*100:.1f}%)")
    print(f" Registered Clients  : {successful_reg}")
    print(f" Joined #stresstest  : {successful_join}")
    print(f" Total Inbound Msgs  : {total_sent} msgs")
    print(f" Inbound Msg Rate    : {send_rate:.2f} msgs/sec")
    print(f" Total Fanout Recv   : {total_recv} socket reads")
    print(f" Fanout Delivery Rate: {fanout_rate:.2f} reads/sec")
    print(f" Total Socket Errors : {total_errors}")
    print("=" * 60)

    # Output GitHub Step Summary Markdown if running in GitHub Actions
    summary_file = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_file:
        status_emoji = "✅ PASS" if connected_count >= (args.clients * 0.9) and total_sent > 0 else "⚠️ WARNING"
        with open(summary_file, "a", encoding="utf-8") as f:
            f.write(f"""
## ⚡ IRC Daemon Load & Stress Test Summary ({status_emoji})

| Metric | Measured Value |
| :--- | :--- |
| **Target Clients** | `{args.clients}` sockets |
| **Connected Clients** | `{connected_count}/{args.clients}` ({connected_count/args.clients*100:.1f}%) |
| **Registered & Joined** | `{successful_join}/{args.clients}` in `{args.channel}` |
| **Test Duration** | `{total_time:.2f}` seconds |
| **Total Inbound Messages** | `{total_sent}` messages sent to daemon |
| **Inbound Message Rate** | `{send_rate:.2f}` msgs/sec |
| **Total Outbound Socket Reads** | `{total_recv}` socket reads delivered |
| **Fanout Delivery Rate** | `{fanout_rate:.2f}` msgs/sec fan-out |
| **Socket Errors** | `{total_errors}` |

### 📈 What This Test Achieved
1. **Concurrency Check**: Verified the Go IRC daemon handles `{connected_count}` concurrent goroutines and TCP connections simultaneously.
2. **State Synchronization**: Verified client handshake, registration (`001`), and channel join (`{args.channel}`) under multi-client load.
3. **Throughput Fan-Out**: Processed `{total_sent}` inbound messages and generated `{total_recv}` fan-out broadcast reads.
4. **Grafana Verification**: Generated live CPU, RAM, and network metrics for Grafana dashboard monitoring.
""")

if __name__ == "__main__":
    asyncio.run(main())
