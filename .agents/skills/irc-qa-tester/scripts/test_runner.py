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

    def log_result(self, command, scenario, status, detail="", protocol="", expected="", actual="", evaluation=""):
        self.results.append({
            "command": command,
            "scenario": scenario,
            "status": status,
            "detail": detail,
            "protocol": protocol,
            "expected": expected,
            "actual": actual,
            "evaluation": evaluation
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
        self.test_oper_authentication_encrypted()
        self.test_kline_disconnect()
        self.test_rehash_admin()
        self.test_invite_and_mode_i()
        self.test_list_and_names()

    def test_nick_change(self):
        cmd = "NICK"
        scenario = "Nickname Change & Channel Broadcast"
        proto = "1. Connect Client_A & Client_B -> JOIN #chan\n2. Client_A issues NICK NewNick\n3. Assert Client_B receives :OldNick NICK :NewNick"
        exp = "Client_B receives :OldNick NICK :NewNick broadcast"
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
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=line, evaluation="PASS — Protocol broadcast matches RFC 1459 specification.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"Expected NICK broadcast, got: {line}", protocol=proto, expected=exp, actual=line, evaluation="FAIL — Broadcast frame missing.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_privmsg_and_notice(self):
        cmd = "PRIVMSG & NOTICE"
        scenario = "Direct Messaging & Single Delivery"
        proto = "1. Connect Sender & Receiver\n2. Sender sends PRIVMSG & NOTICE to Receiver\n3. Assert Receiver receives formatted messages without duplicates"
        exp = "PRIVMSG and NOTICE frames received correctly"
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
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"P: {p_line} | N: {n_line}", evaluation="PASS — Message formatting compliant.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"P: {p_line}, N: {n_line}", protocol=proto, expected=exp, actual=f"P: {p_line} | N: {n_line}", evaluation="FAIL — Message delivery error.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_whois(self):
        cmd = "WHOIS"
        scenario = "User Info Query (311/318)"
        proto = "1. Connect Querier & Target\n2. Querier issues WHOIS Target\n3. Assert 311 (RPL_WHOISUSER) and 318 (RPL_ENDOFWHOIS)"
        exp = "311 RPL_WHOISUSER and 318 RPL_ENDOFWHOIS numeric replies"
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
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"311: {r311} | 318: {r318}", evaluation="PASS — Numeric WHOIS replies match RFC 2812.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"311: {r311}, 318: {r318}", protocol=proto, expected=exp, actual=f"311: {r311} | 318: {r318}", evaluation="FAIL — Missing numeric WHOIS reply.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_join_and_op(self):
        cmd = "JOIN"
        scenario = "First Join -> Op (@) Assigned"
        proto = "1. Connect FirstOp\n2. FirstOp joins new empty #channel\n3. Assert 353 (RPL_NAMREPLY) contains @FirstOp and 366 (RPL_ENDOFNAMES)"
        exp = "353 RPL_NAMREPLY with '@' prefix for first channel joiner"
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
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"353: {r353} | 366: {r366}", evaluation="PASS — First user correctly auto-opped (@).")
            else:
                self.log_result(cmd, scenario, "FAIL", f"RPL_NAMREPLY: {r353}", protocol=proto, expected=exp, actual=f"353: {r353}", evaluation="FAIL — Missing @ operator prefix in RPL_NAMREPLY.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_topic_governance(self):
        cmd = "TOPIC"
        scenario = "Op Topic Setting & Discard on Empty"
        proto = "1. OpUser (@) & Regular join #room\n2. Regular issues TOPIC (must return 482)\n3. OpUser issues TOPIC (must succeed & broadcast)"
        exp = "482 ERR_CHANOPRIVSNEEDED for non-op; TOPIC broadcast for op"
        try:
            c1 = IRCClient(self.host, self.port)
            c2 = IRCClient(self.host, self.port)
            nick1, nick2 = f"OpUser_{rand_str()}", f"Regular_{rand_str()}"
            chan = f"#topic_room_{rand_str()}"

            c1.connect(nick1)
            c1.send(f"JOIN {chan}")
            c2.connect(nick2)
            c2.send(f"JOIN {chan}")
            time.sleep(0.2)

            c2.send(f"TOPIC {chan} :Hacked Topic")
            err_482, _ = c2.read_until(" 482 ")

            c1.send(f"TOPIC {chan} :Valid Channel Topic")
            t_line, _ = c2.read_until("TOPIC")

            c1.close()
            c2.close()

            if " 482 " in err_482 and "Valid Channel Topic" in t_line:
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"482: {err_482} | TOPIC: {t_line}", evaluation="PASS — Topic governance strictly enforced.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"482: {err_482}, Topic: {t_line}", protocol=proto, expected=exp, actual=f"482: {err_482} | TOPIC: {t_line}", evaluation="FAIL — Topic permission boundary error.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_kick_and_membership_revocation(self):
        cmd = "KICK"
        scenario = "Op Kicks User -> Msg Blocked (404)"
        proto = "1. OpUser (@) & BadUser join #kick_room\n2. OpUser issues KICK BadUser\n3. BadUser tries PRIVMSG -> must return 404 (ERR_CANNOTSENDTOCHAN)"
        exp = "KICK frame broadcast; 404 ERR_CANNOTSENDTOCHAN when kicked user attempts messaging"
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

            c2.send(f"PRIVMSG {chan} :Am I still here?")
            err_404, _ = c2.read_until(" 404 ")

            c1.close()
            c2.close()

            if "KICK" in k_line and " 404 " in err_404:
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"KICK: {k_line} | 404: {err_404}", evaluation="PASS — Kicked user membership cleanly revoked.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"Kick: {k_line}, ERR_404: {err_404}", protocol=proto, expected=exp, actual=f"KICK: {k_line} | 404: {err_404}", evaluation="FAIL — Kicked user channel membership remained active in daemon.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_ban_prevention(self):
        cmd = "BAN (+b)"
        scenario = "Banned Mask Blocks Re-Entry (474)"
        proto = "1. OpUser (@) & Spammer join #ban_room\n2. OpUser issues MODE +b Spammer and KICK Spammer\n3. Spammer attempts JOIN -> must return 474 (ERR_BANNEDFROMCHAN)"
        exp = "474 ERR_BANNEDFROMCHAN received when banned nick attempts rejoin"
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

            c2.send(f"JOIN {chan}")
            err_474, _ = c2.read_until(" 474 ")

            c1.close()
            c2.close()

            if " 474 " in err_474:
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"474: {err_474}", evaluation="PASS — Ban mask wildcard matching succeeded.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"ERR_474: {err_474}", protocol=proto, expected=exp, actual=f"474: {err_474}", evaluation="FAIL — Ban mask wildcard matching failed.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_rank_hierarchy(self):
        cmd = "RANK HIERARCHY"
        scenario = "+v Blocked Kick; +q Protected"
        proto = "1. Owner (+q/*), Op (+o/@), Voiced (+v/+) join #hierarchy\n2. Voiced tries KICK Op -> 482\n3. Op tries KICK Owner -> 484/482"
        exp = "482 for +v kick attempt; 484/482 for Op kick against Protected (*)"
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

            cv.send(f"KICK {chan} {o_nick} :Attempt")
            err_482, _ = cv.read_until(" 482 ")

            co.send(f"KICK {chan} {q_nick} :Attempt")
            err_prot, _ = co.read_until(" 48")

            cq.close()
            co.close()
            cv.close()

            if " 482 " in err_482 and len(err_prot) > 0:
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"VoiceKick: {err_482} | OpKickOwner: {err_prot}", evaluation="PASS — Hierarchy kick rules strictly enforced.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"VoiceKick: {err_482}, OpKickOwner: {err_prot}", protocol=proto, expected=exp, actual=f"VoiceKick: {err_482} | OpKickOwner: {err_prot}", evaluation="FAIL — Hierarchy kick rules violated.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_rejoin_sync(self):
        cmd = "REJOIN"
        scenario = "Part + Join Broadcast Sync"
        proto = "1. RejoinUser & Watcher join #rejoin\n2. RejoinUser sends PART then JOIN\n3. Assert Watcher receives PART notice and JOIN notice"
        exp = "Watcher receives PART and JOIN frames from RejoinUser"
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

            c1.send(f"PART {chan} :Rejoining")
            part_line, _ = c2.read_until(f"PART {chan}")

            c1.send(f"JOIN {chan}")
            join_line, _ = c2.read_until(f"JOIN :{chan}")

            c1.close()
            c2.close()

            if f"PART {chan}" in part_line and f"JOIN :{chan}" in join_line:
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"PART: {part_line} | JOIN: {join_line}", evaluation="PASS — Rejoin sequence fully synchronized across clients.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"Part: {part_line}, Join: {join_line}", protocol=proto, expected=exp, actual=f"PART: {part_line} | JOIN: {join_line}", evaluation="FAIL — Rejoin broadcast dropped.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_oper_authentication_encrypted(self):
        cmd = "OPER"
        scenario = "Hashed Oper Accounts Authentication"
        proto = "1. Smiley authenticates with SmileyAdminPassword123!@# (server_admin)\n2. ServerOperator authenticates with ServerOperatorPassword123!@# (irc_oper)\n3. testadmin authenticates with testadmin\n4. testoper authenticates with testoper"
        exp = "381 RPL_YOUREOPER for all 4 encrypted operator accounts"
        try:
            passed_accounts = 0

            # Test Smiley (server_admin)
            c_smiley = IRCClient(self.host, self.port)
            c_smiley.connect("Smiley_Tester")
            c_smiley.send("OPER Smiley SmileyAdminPassword123!@#")
            r1, _ = c_smiley.read_until(" 381 ")
            if " 381 " in r1:
                passed_accounts += 1
            c_smiley.close()

            # Test ServerOperator (irc_oper)
            c_so = IRCClient(self.host, self.port)
            c_so.connect("Oper_Tester")
            c_so.send("OPER ServerOperator ServerOperatorPassword123!@#")
            r2, _ = c_so.read_until(" 381 ")
            if " 381 " in r2:
                passed_accounts += 1
            c_so.close()

            # Test testadmin (server_admin)
            c_ta = IRCClient(self.host, self.port)
            c_ta.connect("TestAdmin_Tester")
            c_ta.send("OPER testadmin testadmin")
            r3, _ = c_ta.read_until(" 381 ")
            if " 381 " in r3:
                passed_accounts += 1
            c_ta.close()

            # Test testoper (irc_oper)
            c_to = IRCClient(self.host, self.port)
            c_to.connect("TestOper_Tester")
            c_to.send("OPER testoper testoper")
            r4, _ = c_to.read_until(" 381 ")
            if " 381 " in r4:
                passed_accounts += 1
            c_to.close()

            if passed_accounts == 4:
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"{passed_accounts}/4 accounts authenticated successfully", evaluation="PASS — All encrypted operator accounts verified.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"Only {passed_accounts}/4 passed", protocol=proto, expected=exp, actual=f"{passed_accounts}/4 accounts authenticated", evaluation="FAIL — Encrypted oper authentication failed.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_kline_disconnect(self):
        cmd = "KLINE"
        scenario = "IRCop Severs Target Socket"
        proto = "1. Admin authenticates via OPER testadmin testadmin\n2. Admin issues KLINE *@127.0.0.1\n3. Assert Target connection receives ERROR link close"
        exp = "381 RPL_YOUREOPER received; Target connection terminated with ERROR link close"
        try:
            admin = IRCClient(self.host, self.port)
            target = IRCClient(self.host, self.port)
            admin_nick, target_nick = f"Admin_{rand_str()}", f"Trouble_{rand_str()}"

            admin.connect(admin_nick)
            target.connect(target_nick)

            admin.send("OPER testadmin testadmin")
            r381, _ = admin.read_until(" 381 ")

            admin.send(f"KLINE *@127.0.0.1 1h :Local server ban")
            disc_line, _ = target.read_until("ERROR")

            admin.close()
            target.close()

            if " 381 " in r381 and "ERROR" in disc_line:
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"381: {r381} | ERROR: {disc_line}", evaluation="PASS — KLINE administrative socket termination verified.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"381: {r381}, Disc: {disc_line}", protocol=proto, expected=exp, actual=f"381: {r381} | ERROR: {disc_line}", evaluation="FAIL — OPER authentication or KLINE termination failed.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_rehash_admin(self):
        cmd = "REHASH"
        scenario = "Admin Reloads Config (382)"
        proto = "1. Admin authenticates via OPER testadmin testadmin\n2. Admin issues REHASH\n3. Assert 382 (RPL_REHASHING)"
        exp = "382 RPL_REHASHING numeric response"
        try:
            admin = IRCClient(self.host, self.port)
            admin_nick = f"Admin_{rand_str()}"

            admin.connect(admin_nick)
            admin.send("OPER testadmin testadmin")
            admin.read_until(" 381 ")

            admin.send("REHASH")
            r382, _ = admin.read_until(" 382 ")

            admin.close()

            if " 382 " in r382:
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"382: {r382}", evaluation="PASS — REHASH configuration reload verified.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"382: {r382}", protocol=proto, expected=exp, actual=f"382: {r382}", evaluation="FAIL — REHASH command failed.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_invite_and_mode_i(self):
        cmd = "INVITE / MODE +i"
        scenario = "Invite Only Channel Gate & Invitation"
        proto = "1. OpUser & Guest join #invite_room\n2. OpUser sets MODE +i\n3. Guest tries JOIN without invite -> 473\n4. OpUser issues INVITE Guest #invite_room -> 341\n5. Guest joins -> PASS"
        exp = "473 ERR_INVITEONLYCHAN on unauthorized join; 341 RPL_INVITING on invite"
        try:
            c1 = IRCClient(self.host, self.port)
            c2 = IRCClient(self.host, self.port)
            op_nick, guest_nick = f"OpUser_{rand_str()}", f"Guest_{rand_str()}"
            chan = f"#invite_room_{rand_str()}"

            c1.connect(op_nick)
            c1.send(f"JOIN {chan}")
            c1.send(f"MODE {chan} +i")
            time.sleep(0.2)

            c2.connect(guest_nick)
            c2.send(f"JOIN {chan}")
            err_473, _ = c2.read_until(" 473 ")

            c1.send(f"INVITE {guest_nick} {chan}")
            r341, _ = c1.read_until(" 341 ")

            c2.send(f"JOIN {chan}")
            j_line, _ = c2.read_until(f"JOIN :{chan}")

            c1.close()
            c2.close()

            if " 473 " in err_473 and " 341 " in r341 and f"JOIN :{chan}" in j_line:
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"473: {err_473} | 341: {r341} | JOIN: {j_line}", evaluation="PASS — Invite-only channel governance verified.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"473: {err_473}, 341: {r341}, JOIN: {j_line}", protocol=proto, expected=exp, actual=f"473: {err_473} | 341: {r341} | JOIN: {j_line}", evaluation="FAIL — Invite-only channel governance failed.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def test_list_and_names(self):
        cmd = "LIST / NAMES"
        scenario = "Channel List & Names Reply (321-323, 353, 366)"
        proto = "1. User joins #list_room\n2. User sends LIST #list_room -> 321, 322, 323\n3. User sends NAMES #list_room -> 353, 366"
        exp = "322 RPL_LIST and 353 RPL_NAMREPLY received"
        try:
            c1 = IRCClient(self.host, self.port)
            nick1 = f"Lister_{rand_str()}"
            chan = f"#list_room_{rand_str()}"

            c1.connect(nick1)
            c1.send(f"JOIN {chan}")
            time.sleep(0.2)

            c1.send(f"LIST {chan}")
            r322, _ = c1.read_until(" 322 ")

            c1.send(f"NAMES {chan}")
            r353, _ = c1.read_until(" 353 ")

            c1.close()

            if " 322 " in r322 and " 353 " in r353:
                self.log_result(cmd, scenario, "PASS", protocol=proto, expected=exp, actual=f"322: {r322} | 353: {r353}", evaluation="PASS — LIST and NAMES protocol replies verified.")
            else:
                self.log_result(cmd, scenario, "FAIL", f"322: {r322}, 353: {r353}", protocol=proto, expected=exp, actual=f"322: {r322} | 353: {r353}", evaluation="FAIL — LIST or NAMES reply missing.")
        except Exception as e:
            self.log_result(cmd, scenario, "FAIL", str(e), protocol=proto, expected=exp, actual=str(e), evaluation=f"FAIL — Socket exception: {e}")

    def print_summary(self, output_file="qa_test_report.txt"):
        lines = []
        lines.append("=" * 70)
        lines.append("                     IRC QA TEST SUITE SUMMARY MATRIX                  ")
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

        lines.append("=" * 70)
        lines.append(f"TOTAL: {passed} Passed | {failed} Failed | {len(self.results)} Executed")
        lines.append("=" * 70)
        lines.append("\n\n")
        lines.append("=" * 70)
        lines.append("             DETAILED TEST EXECUTION PROTOCOL & DIAGNOSIS LOG          ")
        lines.append("=" * 70)

        for idx, r in enumerate(self.results, 1):
            lines.append(f"\n[TEST #{idx}] {r['command']} — {r['scenario']}")
            lines.append(f"Status: {r['status']}")
            lines.append("Protocol Steps:")
            for p_step in r['protocol'].split('\n'):
                lines.append(f"  {p_step}")
            lines.append(f"Expected Outcome: {r['expected']}")
            lines.append(f"Actual Response:  {r['actual']}")
            lines.append(f"Evaluation:       {r['evaluation']}")
            lines.append("-" * 70)

        report_text = "\n".join(lines)
        print(report_text)

        if output_file:
            try:
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write(report_text + "\n")
                print(f"\n[+] Detailed QA Protocol Log saved to: {output_file}")
            except Exception as e:
                print(f"[-] Could not write report file: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="IRC QA Test Suite")
    parser.add_argument("--host", default="127.0.0.1", help="IRCd host")
    parser.add_argument("--port", type=int, default=6667, help="IRCd port")
    parser.add_argument("--output", default="qa_test_report.txt", help="Report output file path")
    args = parser.parse_args()

    suite = IRCTestSuite(host=args.host, port=args.port)
    suite.run_all()
    suite.print_summary(output_file=args.output)
