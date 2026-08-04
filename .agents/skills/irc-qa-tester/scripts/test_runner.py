#!/usr/bin/env python3
"""
Automated E2E Test Suite for Go-IRCd & Web Client Protocol Validation.
Usage:
    python test_runner.py [--host HOST] [--port PORT]
"""

import sys
import socket
import time
import random
import string
import argparse

class IRCClient:
    def __init__(self, host='127.0.0.1', port=6667, timeout=5.0):
        self.host = host
        self.port = port
        self.timeout = timeout
        self.sock = None
        self.nick = ""
        self.user = ""
        self.buffer = ""

    def connect(self, nick, user="user", realname="IRC QA Tester"):
        self.nick = nick
        self.user = user
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(self.timeout)
        self.sock.connect((self.host, self.port))
        self.send(f"NICK {nick}")
        self.send(f"USER {user} 0 * :{realname}")
        time.sleep(0.1)

    def send(self, data):
        if self.sock:
            self.sock.sendall((data + "\r\n").encode('utf-8'))

    def read_line(self):
        while "\r\n" not in self.buffer:
            try:
                data = self.sock.recv(4096)
                if not data:
                    return ""
                self.buffer += data.decode('utf-8', errors='ignore')
            except socket.timeout:
                return ""
            except Exception:
                return ""

        line, self.buffer = self.buffer.split("\r\n", 1)
        return line.strip()

    def read_until(self, substring, timeout=5.0):
        start = time.time()
        lines = []
        while time.time() - start < timeout:
            line = self.read_line()
            if line:
                lines.append(line)
                if substring in line:
                    return line, lines
        return "", lines

    def flush(self):
        self.buffer = ""
        self.sock.settimeout(0.2)
        try:
            while True:
                data = self.sock.recv(4096)
                if not data:
                    break
        except Exception:
            pass
        self.sock.settimeout(self.timeout)

    def close(self):
        if self.sock:
            try:
                self.send("QUIT :Testing complete")
                self.sock.close()
            except Exception:
                pass
            self.sock = None

def rand_str(length=6):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

class IRCTestSuite:
    def __init__(self, host='127.0.0.1', port=6667):
        self.host = host
        self.port = port
        self.results = []

    def log_result(self, command, scenario, status, detail=""):
        self.results.append({
            "command": command,
            "scenario": scenario,
            "status": status,
            "detail": detail
        })

    def run_all(self):
        print(f"Starting E2E IRC QA Suite against {self.host}:{self.port}...\n")
        self.test_nick_change()
        self.test_privmsg_and_notice()
        self.test_whois()
        self.test_join_and_op()
        self.test_topic_governance()
        self.test_kick_and_membership_revocation()
        self.test_ban_prevention()
        self.test_rank_hierarchy()
        self.test_rejoin_sync()
        self.test_kline_disconnect()
        self.test_rehash_admin()
        self.print_summary()

    def test_nick_change(self):
        cmd = "NICK"
        scenario = "Nickname Change & Channel Broadcast"
        try:
            c1 = IRCClient(self.host, self.port)
            c2 = IRCClient(self.host, self.port)
            nick1, nick2 = f"UserA_{rand_str()}", f"UserB_{rand_str()}"
            new_nick = f"UserA_New_{rand_str()}"
            chan = f"#test_nick_{rand_str()}"

            c1.connect(nick1)
            c2.connect(nick2)
            c1.send(f"JOIN {chan}")
            c2.send(f"JOIN {chan}")
            time.sleep(0.2)
            c2.flush()

            c1.send(f"NICK {new_nick}")
            line, _ = c2.read_until(f"NICK :{new_nick}")

            c1.close()
            c2.close()

            if f"NICK :{new_nick}" in line or new_nick in line:
                self.log_result(cmd, scenario, "PASS")
            else:
                self.log_result(cmd, scenario, "FAIL", f"Expected NICK broadcast, got: {line}")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e))

    def test_privmsg_and_notice(self):
        cmd = "PRIVMSG & NOTICE"
        scenario = "Direct Messaging & Single Delivery"
        try:
            c1 = IRCClient(self.host, self.port)
            c2 = IRCClient(self.host, self.port)
            nick1, nick2 = f"Sender_{rand_str()}", f"Recv_{rand_str()}"

            c1.connect(nick1)
            c2.connect(nick2)

            c1.send(f"PRIVMSG {nick2} :Hello Direct Message")
            p_line, _ = c2.read_until("PRIVMSG")

            c1.send(f"NOTICE {nick2} :System Notice Message")
            n_line, _ = c2.read_until("NOTICE")

            c1.close()
            c2.close()

            if "Hello Direct Message" in p_line and "System Notice Message" in n_line:
                self.log_result(cmd, scenario, "PASS")
            else:
                self.log_result(cmd, scenario, "FAIL", f"P: {p_line}, N: {n_line}")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e))

    def test_whois(self):
        cmd = "WHOIS"
        scenario = "User Info Query (311/318)"
        try:
            c1 = IRCClient(self.host, self.port)
            c2 = IRCClient(self.host, self.port)
            nick1, nick2 = f"Querier_{rand_str()}", f"Target_{rand_str()}"

            c1.connect(nick1)
            c2.connect(nick2)

            c1.send(f"WHOIS {nick2}")
            r311, _ = c1.read_until(" 311 ")
            r318, _ = c1.read_until(" 318 ")

            c1.close()
            c2.close()

            if " 311 " in r311 and " 318 " in r318:
                self.log_result(cmd, scenario, "PASS")
            else:
                self.log_result(cmd, scenario, "FAIL", f"311: {r311}, 318: {r318}")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e))

    def test_join_and_op(self):
        cmd = "JOIN"
        scenario = "First Join -> Op (@) Assigned"
        try:
            c1 = IRCClient(self.host, self.port)
            nick1 = f"FirstOp_{rand_str()}"
            chan = f"#chan_op_{rand_str()}"

            c1.connect(nick1)
            c1.send(f"JOIN {chan}")
            r353, _ = c1.read_until(" 353 ")
            r366, _ = c1.read_until(" 366 ")

            c1.close()

            if f"@{nick1}" in r353 and " 366 " in r366:
                self.log_result(cmd, scenario, "PASS")
            else:
                self.log_result(cmd, scenario, "FAIL", f"RPL_NAMREPLY: {r353}")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e))

    def test_topic_governance(self):
        cmd = "TOPIC"
        scenario = "Op Topic Setting & Discard on Empty"
        try:
            c1 = IRCClient(self.host, self.port)
            c2 = IRCClient(self.host, self.port)
            nick1, nick2 = f"OpUser_{rand_str()}", f"Regular_{rand_str()}"
            chan = f"#topic_room_{rand_str()}"

            c1.connect(nick1) # Gets @
            c1.send(f"JOIN {chan}")
            c2.connect(nick2)
            c2.send(f"JOIN {chan}")
            time.sleep(0.2)

            # Non-operator attempt to set topic -> FAIL
            c2.send(f"TOPIC {chan} :Hacked Topic")
            err_482, _ = c2.read_until(" 482 ")

            # Op sets topic -> SUCCESS
            c1.send(f"TOPIC {chan} :Valid Channel Topic")
            t_line, _ = c2.read_until("TOPIC")

            c1.close()
            c2.close()

            if " 482 " in err_482 and "Valid Channel Topic" in t_line:
                self.log_result(cmd, scenario, "PASS")
            else:
                self.log_result(cmd, scenario, "FAIL", f"482: {err_482}, Topic: {t_line}")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e))

    def test_kick_and_membership_revocation(self):
        cmd = "KICK"
        scenario = "Op Kicks User -> Msg Blocked (404)"
        try:
            c1 = IRCClient(self.host, self.port)
            c2 = IRCClient(self.host, self.port)
            op_nick, bad_nick = f"OpUser_{rand_str()}", f"BadUser_{rand_str()}"
            chan = f"#kick_room_{rand_str()}"

            c1.connect(op_nick)
            c1.send(f"JOIN {chan}")
            c2.connect(bad_nick)
            c2.send(f"JOIN {chan}")
            time.sleep(0.2)

            c1.send(f"KICK {chan} {bad_nick} :Rule violation")
            k_line, _ = c2.read_until("KICK")

            # Kicked user attempts to message channel -> 404 CANNOTSENDTOCHAN
            c2.send(f"PRIVMSG {chan} :Am I still here?")
            err_404, _ = c2.read_until(" 404 ")

            c1.close()
            c2.close()

            if "KICK" in k_line and " 404 " in err_404:
                self.log_result(cmd, scenario, "PASS")
            else:
                self.log_result(cmd, scenario, "FAIL", f"Kick: {k_line}, ERR_404: {err_404}")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e))

    def test_ban_prevention(self):
        cmd = "BAN (+b)"
        scenario = "Banned Mask Blocks Re-Entry (474)"
        try:
            c1 = IRCClient(self.host, self.port)
            c2 = IRCClient(self.host, self.port)
            op_nick, ban_nick = f"OpUser_{rand_str()}", f"Spammer_{rand_str()}"
            chan = f"#ban_room_{rand_str()}"

            c1.connect(op_nick)
            c1.send(f"JOIN {chan}")
            c2.connect(ban_nick)
            c2.send(f"JOIN {chan}")
            time.sleep(0.2)

            c1.send(f"MODE {chan} +b {ban_nick}!*@*")
            c1.send(f"KICK {chan} {ban_nick} :Banned")
            time.sleep(0.2)

            # Banned user attempts rejoin -> ERR_BANNEDFROMCHAN 474
            c2.send(f"JOIN {chan}")
            err_474, _ = c2.read_until(" 474 ")

            c1.close()
            c2.close()

            if " 474 " in err_474:
                self.log_result(cmd, scenario, "PASS")
            else:
                self.log_result(cmd, scenario, "FAIL", f"ERR_474: {err_474}")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e))

    def test_rank_hierarchy(self):
        cmd = "RANK HIERARCHY"
        scenario = "+v Blocked Kick; +q Protected"
        try:
            cq = IRCClient(self.host, self.port)
            co = IRCClient(self.host, self.port)
            cv = IRCClient(self.host, self.port)
            q_nick, o_nick, v_nick = f"Owner_{rand_str()}", f"Op_{rand_str()}", f"Voice_{rand_str()}"
            chan = f"#hierarchy_room_{rand_str()}"

            cq.connect(q_nick)
            cq.send(f"JOIN {chan}")
            co.connect(o_nick)
            co.send(f"JOIN {chan}")
            cv.connect(v_nick)
            cv.send(f"JOIN {chan}")
            time.sleep(0.2)

            cq.send(f"MODE {chan} +q {q_nick}")
            cq.send(f"MODE {chan} +o {o_nick}")
            cq.send(f"MODE {chan} +v {v_nick}")
            time.sleep(0.2)

            # Voiced (+v) attempts kick -> 482 ERR_CHANOPRIVSNEEDED
            cv.send(f"KICK {chan} {o_nick} :Attempt")
            err_482, _ = cv.read_until(" 482 ")

            # Op (@) attempts kick against Protected (*) -> 484 or 482
            co.send(f"KICK {chan} {q_nick} :Attempt")
            err_prot, _ = co.read_until(" 48")

            cq.close()
            co.close()
            cv.close()

            if " 482 " in err_482 and len(err_prot) > 0:
                self.log_result(cmd, scenario, "PASS")
            else:
                self.log_result(cmd, scenario, "FAIL", f"VoiceKick: {err_482}, OpKickOwner: {err_prot}")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e))

    def test_rejoin_sync(self):
        cmd = "REJOIN"
        scenario = "Part + Join Broadcast Sync"
        try:
            c1 = IRCClient(self.host, self.port)
            c2 = IRCClient(self.host, self.port)
            nick1, nick2 = f"RejoinUser_{rand_str()}", f"Watcher_{rand_str()}"
            chan = f"#rejoin_room_{rand_str()}"

            c1.connect(nick1)
            c1.send(f"JOIN {chan}")
            c2.connect(nick2)
            c2.send(f"JOIN {chan}")
            time.sleep(0.2)
            c2.flush()

            # c1 performs PART + JOIN cycle
            c1.send(f"PART {chan} :Rejoining")
            part_line, _ = c2.read_until(f"PART {chan}")

            c1.send(f"JOIN {chan}")
            join_line, _ = c2.read_until(f"JOIN :{chan}")

            c1.close()
            c2.close()

            if f"PART {chan}" in part_line and f"JOIN :{chan}" in join_line:
                self.log_result(cmd, scenario, "PASS")
            else:
                self.log_result(cmd, scenario, "FAIL", f"Part: {part_line}, Join: {join_line}")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e))

    def test_kline_disconnect(self):
        cmd = "KLINE"
        scenario = "IRCop Severs Target Socket"
        try:
            admin = IRCClient(self.host, self.port)
            target = IRCClient(self.host, self.port)
            admin_nick, target_nick = f"Admin_{rand_str()}", f"Trouble_{rand_str()}"

            admin.connect(admin_nick)
            target.connect(target_nick)

            admin.send("OPER admin_account admin_password")
            r381, _ = admin.read_until(" 381 ")

            admin.send(f"KLINE *@127.0.0.1 1h :Local server ban")
            disc_line, _ = target.read_until("ERROR")

            admin.close()
            target.close()

            if " 381 " in r381 and "ERROR" in disc_line:
                self.log_result(cmd, scenario, "PASS")
            else:
                self.log_result(cmd, scenario, "FAIL", f"381: {r381}, Disc: {disc_line}")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e))

    def test_rehash_admin(self):
        cmd = "REHASH"
        scenario = "Admin Reloads Config (382)"
        try:
            admin = IRCClient(self.host, self.port)
            admin_nick = f"Admin_{rand_str()}"

            admin.connect(admin_nick)
            admin.send("OPER admin_account admin_password")
            admin.read_until(" 381 ")

            admin.send("REHASH")
            r382, _ = admin.read_until(" 382 ")

            admin.close()

            if " 382 " in r382:
                self.log_result(cmd, scenario, "PASS")
            else:
                self.log_result(cmd, scenario, "FAIL", f"382: {r382}")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e))

    def print_summary(self, output_file="qa_test_report.log"):
        lines = []
        lines.append("=" * 70)
        lines.append("                     IRC QA TEST SUITE RUN RESULTS                     ")
        lines.append("=" * 70)
        lines.append(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"Target: {self.host}:{self.port}")
        lines.append("-" * 70)
        lines.append(f"{'COMMAND':<22} {'TEST SCENARIO':<34} {'STATUS':<8}")
        lines.append("-" * 70)

        passed = 0
        failed = 0
        for r in self.results:
            status = r['status']
            if status == "PASS":
                passed += 1
            else:
                failed += 1
            lines.append(f"{r['command']:<22} {r['scenario']:<34} {status:<8}")
            if r['detail']:
                lines.append(f"   -> Detail: {r['detail']}")

        lines.append("=" * 70)
        lines.append(f"TOTAL: {passed} Passed | {failed} Failed | {len(self.results)} Executed")
        lines.append("=" * 70)

        report_text = "\n".join(lines)
        print(report_text)

        if output_file:
            try:
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write(report_text + "\n")
                print(f"\n[+] Detailed QA Report saved to: {output_file}")
            except Exception as e:
                print(f"[-] Could not write report file: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IRC QA Test Suite")
    parser.add_argument("--host", default="127.0.0.1", help="IRCd host")
    parser.add_argument("--port", type=int, default=6667, help="IRCd port")
    parser.add_argument("--output", default="qa_test_report.log", help="Report output file path")
    args = parser.parse_args()

    suite = IRCTestSuite(host=args.host, port=args.port)
    suite.run_all()
    suite.print_summary(output_file=args.output)
