#!/usr/bin/env python3
"""Parse the Polla Mundial 2026 predictions CSV into data.js for the dashboard.
Run:  python3 parser.py
"""
import csv, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "predictions.csv")

# Column layout (0-indexed), validated against the file:
C_NAME = 0
GROUP = (2, 74)        # 72 group matches -> '1' / 'E' / '2'
R32   = (74, 106)      # 32 team codes
R16   = (107, 123)     # 16 team codes
QF    = (124, 132)     # 8 team codes
SF    = (133, 137)     # 4 team codes
C_4TH, C_3RD, C_SUB, C_CHAMP, C_GOLE = 137, 138, 139, 140, 141

# 3-letter code -> display name (FIFA 2026 qualified/likely pool). Unknown codes
# fall back to the code itself in the UI.
TEAM_NAMES = {
    "MEX":"Mexico","CAN":"Canada","USA":"United States","ARG":"Argentina","BRA":"Brazil",
    "FRA":"France","ESP":"Spain","ENG":"England","GER":"Germany","NED":"Netherlands",
    "POR":"Portugal","BEL":"Belgium","CRO":"Croatia","URU":"Uruguay","COL":"Colombia",
    "SUI":"Switzerland","ECU":"Ecuador","SEN":"Senegal","MAR":"Morocco","JPN":"Japan",
    "KOR":"South Korea","AUS":"Australia","IRN":"Iran","KSA":"Saudi Arabia","QAT":"Qatar",
    "NOR":"Norway","SWE":"Sweden","TUR":"Turkey","CZE":"Czechia","AUT":"Austria",
    "SCO":"Scotland","CIV":"Ivory Coast","EGY":"Egypt","TUN":"Tunisia","ALG":"Algeria",
    "GHA":"Ghana","CPV":"Cape Verde","RSA":"South Africa","COD":"DR Congo","NZL":"New Zealand",
    "PAR":"Paraguay","PAN":"Panama","BIH":"Bosnia & H.","UZB":"Uzbekistan","IRQ":"Iraq",
    "JOR":"Jordan","CUW":"Curacao","HAI":"Haiti","NGA":"Nigeria",
}

def main():
    rows = list(csv.reader(open(SRC, encoding="utf-8-sig")))
    away = rows[2]   # "Equipo 2"
    home = rows[4]   # "Equipo 1"

    schedule = [{"home": home[i], "away": away[i]} for i in range(*GROUP)]

    participants = []
    for r in rows[5:]:
        if not r[C_NAME].strip():
            continue
        participants.append({
            "name": r[C_NAME].strip(),
            "group": [r[i] for i in range(*GROUP)],
            "r32": [c for c in (r[i] for i in range(*R32)) if c.strip()],
            "r16": [c for c in (r[i] for i in range(*R16)) if c.strip()],
            "qf":  [c for c in (r[i] for i in range(*QF))  if c.strip()],
            "sf":  [c for c in (r[i] for i in range(*SF))  if c.strip()],
            "fourth":   r[C_4TH].strip(),
            "third":    r[C_3RD].strip(),
            "runnerUp": r[C_SUB].strip(),
            "champion": r[C_CHAMP].strip(),
            "scorer":   r[C_GOLE].strip(),
        })

    # All team codes appearing anywhere, for selectors
    codes = set()
    for p in participants:
        codes.update(p["r32"] + p["r16"] + p["qf"] + p["sf"])
        for m in schedule:
            codes.add(m["home"]); codes.add(m["away"])
    teams = sorted(c for c in codes if c.strip())

    scorers = sorted({p["scorer"] for p in participants if p["scorer"]})

    # Derive the 12 groups: teams that play each other form a group (connected
    # components of the match graph). Order groups & teams by first appearance.
    parent={}
    def find(x):
        parent.setdefault(x,x)
        while parent[x]!=x:
            parent[x]=parent[parent[x]]; x=parent[x]
        return x
    def union(a,b): parent[find(a)]=find(b)
    for m in schedule: union(m["home"], m["away"])
    first_idx={}
    for i,m in enumerate(schedule):
        for t in (m["home"], m["away"]):
            first_idx.setdefault(t,i)
    comp={}
    for t in list(parent):
        comp.setdefault(find(t), []).append(t)
    # Official FIFA group letters (the match graph gives the right team *sets*, but the
    # letter must be the official one, not first-appearance order).
    OFFICIAL_GROUP = {
        "MEX":"A","RSA":"A","KOR":"A","CZE":"A",
        "CAN":"B","BIH":"B","QAT":"B","SUI":"B",
        "BRA":"C","MAR":"C","HAI":"C","SCO":"C",
        "USA":"D","PAR":"D","AUS":"D","TUR":"D",
        "GER":"E","CUW":"E","CIV":"E","ECU":"E",
        "NED":"F","JPN":"F","SWE":"F","TUN":"F",
        "BEL":"G","EGY":"G","IRN":"G","NZL":"G",
        "ESP":"H","CPV":"H","KSA":"H","URU":"H",
        "FRA":"I","SEN":"I","IRQ":"I","NOR":"I",
        "ARG":"J","ALG":"J","AUT":"J","JOR":"J",
        "POR":"K","COD":"K","UZB":"K","COL":"K",
        "ENG":"L","CRO":"L","GHA":"L","PAN":"L",
    }
    groups=[]
    for g in comp.values():
        gset=set(g)
        label=OFFICIAL_GROUP.get(next(iter(g)), "?")
        teams_g=sorted(g, key=lambda t: first_idx[t])
        matches=[i for i,m in enumerate(schedule) if m["home"] in gset and m["away"] in gset]
        groups.append({"label":label, "teams":teams_g, "matches":matches})
    groups.sort(key=lambda g: g["label"])

    data = {
        "schedule": schedule,
        "groups": groups,
        "teams": teams,
        "teamNames": {c: TEAM_NAMES.get(c, c) for c in teams},
        "scorers": scorers,
        "participants": participants,
        "points": {"group":1, "r32":2, "r16":3, "qf":4, "sf":5,
                    "fourth":10, "third":10, "runnerUp":15, "champion":25, "scorer":15},
    }

    out = os.path.join(HERE, "data.js")
    with open(out, "w", encoding="utf-8") as f:
        f.write("// Auto-generated by parser.py — do not edit by hand.\n")
        f.write("window.DATA = ")
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write(";\n")

    print(f"Wrote {out}")
    print(f"  participants : {len(participants)}")
    print(f"  matches      : {len(schedule)}")
    print(f"  teams        : {len(teams)}")
    print(f"  scorer picks : {len(scorers)}")

if __name__ == "__main__":
    main()
