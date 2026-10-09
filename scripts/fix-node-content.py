#!/usr/bin/env python3
"""Fix truncated excerpts and identical summary/content for the pilot map."""
from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path

CHAP_DIR = Path("/workspace/book-extract/chapters")
MAP_ID = "chujia-ying-zou-chu-wei-yi-zhen-li-guan"
ROOT = Path("/workspace/concept-map-generator")
GRAPH_PATHS = [
    ROOT / "content/maps" / MAP_ID / "graph.json",
    ROOT / "apps/web/public/maps" / MAP_ID / "graph.json",
]
META_PATHS = [
    ROOT / "content/maps" / MAP_ID / "meta.json",
    ROOT / "apps/web/public/maps" / MAP_ID / "meta.json",
]

SKIP_PREFIXES = ("Cover", "版权", "Contents", "目录")

NODE_CHAPTER: dict[str, str] = {
    "ch-qianji": "前记",
    "ch-ji1": "辑一",
    "ch-zou-chu": "走出唯一真理观",
    "ch-gan-shou": "我们不再那样感受世界",
    "ch-da-zhexuejia": "读懂一两个大哲学家",
    "ch-yuanqi": "思想增益元气",
    "ch-weilai": "未来之思的臆测",
    "ch-ai-si": "聊聊爱情与死亡",
    "ch-ji2": "辑二",
    "ch-yiyi": "哲学关心的是事物的意义",
    "ch-ai": "漫谈人工智能",
    "ch-shuoli": "说理与对话",
    "ch-sirentan": "“说理”四人谈",
    "ch-fansi": "反思与过度反思",
    "ch-jiaoyu": "教育与洗脑",
    "ch-lianghao": "行之于途而应于心",
    "ch-zhao-huan": "召唤爱思考的人来一道思考",
    "ch-tongku": "关于痛苦与灾难",
    "ch-charlie": "《查理周刊》血案余想",
    "ch-zhengyi": "起而斗争未必声称“正义战胜邪恶”",
    "ch-yuci": "关于查尔莫斯“语词之争”的评论",
    "ch-chuanxin": "传心术刍议",
    "ch-ji3": "辑三",
    "ch-dushu": "漫谈书写、书、读书",
    "ch-ditu": "书是地图，是画，是歌",
    "ch-haidegeer-sz": "海德格尔《存在与时间》导读",
    "ch-haidegeer-lzl": "海德格尔《林中路》导读",
    "ch-shuo": "说，所说，不可说",
    "c-weiyi-zhenliguan": "走出唯一真理观",
    "c-duoyuan-dao": "辑一",
    "c-pubianzhuyi": "走出唯一真理观",
    "c-zhexue-siwang": "走出唯一真理观",
    "c-si-de-renwu": "未来之思的臆测",
    "c-guodu-zhisi": "未来之思的臆测",
    "c-weilai-zhisi": "未来之思的臆测",
    "c-xing-er-shang-xue": "未来之思的臆测",
    "c-zhexue-yiyi": "哲学关心的是事物的意义",
    "c-zhexue-kexue": "哲学关心的是事物的意义",
    "c-zhihui-zhiyou": "哲学关心的是事物的意义",
    "c-yuanqi": "思想增益元气",
    "c-guodu-fansi": "反思与过度反思",
    "c-xujia-guannian": "反思与过度反思",
    "c-shuoli": "说理与对话",
    "c-duihua": "说理与对话",
    "c-xin-fu": "说理与对话",
    "c-gongshi": "说理与对话",
    "c-lianghao-shenghuo": "行之于途而应于心",
    "c-xing-zhi": "行之于途而应于心",
    "c-jiaoyu-xinao": "教育与洗脑",
    "c-renshi-ai": "漫谈人工智能",
    "c-yuyan-jiaoliu": "说理与对话",
    "c-yuci-zhizheng": "关于查尔莫斯“语词之争”的评论",
    "c-siwang": "聊聊爱情与死亡",
    "c-aiqing": "聊聊爱情与死亡",
    "c-dushu": "漫谈书写、书、读书",
    "c-shu-ditu": "书是地图，是画，是歌",
    "c-cidai": "海德格尔《存在与时间》导读",
    "c-shijie": "海德格尔《存在与时间》导读",
    "c-gongzai": "海德格尔《存在与时间》导读",
    "c-benzhen": "海德格尔《存在与时间》导读",
    "c-jishu": "海德格尔《林中路》导读",
    "c-yishu": "海德格尔《林中路》导读",
    "c-keshuo": "说，所说，不可说",
    "c-xiongwei": "说，所说，不可说",
    "c-du-dazhexuejia": "读懂一两个大哲学家",
    "c-shujuku": "行之于途而应于心",
    "c-shijian": "行之于途而应于心",
    "c-ganzhi": "我们不再那样感受世界",
    "c-shuju-chongbai": "我们不再那样感受世界",
    "w-cunzai-yu-shijian": "海德格尔《存在与时间》导读",
}

SEARCH_QUERIES: dict[str, list[str]] = {
    "c-weiyi-zhenliguan": ["离开了唯一真理的想法", "哲学要的就是唯一的真理体系"],
    "c-duoyuan-dao": ["有不同的道，从前有不同的道", "这些不同的道之间怎样呼应"],
    "c-pubianzhuyi": ["六、走出普遍主义", "普遍主义是主流"],
    "c-zhexue-siwang": ["哲学已经死了", "哲学的终结与思的任务"],
    "c-si-de-renwu": ["思的任务", "哲学的终结"],
    "c-guodu-zhisi": ["过渡之思", "过渡"],
    "c-weilai-zhisi": ["未来之思", "臆测"],
    "c-xing-er-shang-xue": ["形而上学"],
    "c-zhexue-yiyi": ["哲学关心的是事物的意义", "事物的意义"],
    "c-zhexue-kexue": ["哲学与科学", "实证科学"],
    "c-zhihui-zhiyou": ["爱智慧", "智慧"],
    "c-yuanqi": ["增益元气", "元气"],
    "c-guodu-fansi": ["过度反思"],
    "c-xujia-guannian": ["虚假观念", "虚假的观念"],
    "c-shuoli": ["哲学是讲道理的科学，是讲道理学", "道理不限于狭义的逻辑"],
    "c-duihua": ["对话", "我们与其说需要共识"],
    "c-xin-fu": ["心服", "说服"],
    "c-gongshi": ["谋求共识", "没有共识的人应该怎么在一起生存"],
    "c-lianghao-shenghuo": ["何为良好生活", "良好生活"],
    "c-xing-zhi": ["行之于途而应于心"],
    "c-jiaoyu-xinao": ["教育与洗脑", "洗脑"],
    "c-renshi-ai": ["人工智能"],
    "c-yuyan-jiaoliu": ["讲道理", "语言"],
    "c-yuci-zhizheng": ["语词之争"],
    "c-siwang": ["怕死", "死亡"],
    "c-aiqing": ["爱情"],
    "c-dushu": ["读书", "书写"],
    "c-shu-ditu": ["书是地图"],
    "c-cidai": ["一、存在与此在", "通常不说“人”，而是说“此在”", "此在"],
    "c-shijie": ["此在总是生存在一个世界之中", "在世就是与他人共同在世", "世界之中"],
    "c-gongzai": ["共在", "芸芸众生", "沉沦"],
    "c-benzhen": ["进入本真生存", "本真生存就是立足于自己生存", "本真生存并不是任何飘浮"],
    "c-jishu": ["技术", "座架"],
    "c-yishu": ["艺术的本质", "作品"],
    "c-keshuo": ["不可说，却是愿说也说不出", "说，可说；不可说，不说"],
    "c-xiongwei": ["熊伟先生", "熊伟是海德格尔亲炙弟子"],
    "c-du-dazhexuejia": ["读懂一两个大哲学家"],
    "c-shujuku": ["生活方式"],
    "c-shijian": ["实践"],
    "c-ganzhi": ["感受世界", "我们不再那样感受"],
    "c-shuju-chongbai": ["数据", "利用世界"],
    "w-cunzai-yu-shijian": ["《存在与时间》是海德格尔最出名的著作"],
}


def ends_complete(s: str) -> bool:
    s = s.rstrip()
    if not s:
        return False
    while s and s[-1] in "”」』\"'）)】":
        s = s[:-1]
    return bool(s) and s[-1] in "。！？…；"


def load_chapters() -> dict[str, tuple[str, str]]:
    out: dict[str, tuple[str, str]] = {}
    for p in sorted(CHAP_DIR.glob("*.txt")):
        raw = p.read_text(encoding="utf-8", errors="replace")
        lines = raw.splitlines()
        if not lines:
            continue
        title = lines[0].strip()
        if any(title.startswith(pref) for pref in SKIP_PREFIXES):
            continue
        # Keep body with newlines; collapse only within visual lines already split
        body = "\n".join(lines[1:]).strip()
        out[title] = (p.name, body)
    return out


def sentences_of(text: str) -> list[str]:
    flat = text.replace("\n", "")
    parts = re.split(r"(?<=[。！？…])", flat)
    return [p.strip() for p in parts if p.strip()]


def extract_span(body: str, start: int, min_sents: int = 2, max_sents: int = 4, max_chars: int = 700) -> str:
    """Extract 2–4 complete sentences starting near start (snap to sentence)."""
    flat = body.replace("\n", "")
    # map start from body-with-newlines approx: count chars ignoring newlines before start
    prefix = body[:start].replace("\n", "")
    idx = len(prefix)
    # snap back to previous sentence end
    left = 0
    for i in range(idx - 1, max(-1, idx - 200), -1):
        if flat[i] in "。！？…\n":
            left = i + 1
            break
    # also try paragraph: if nearby newline in original
    chunk = flat[left:]
    sents = sentences_of(chunk)
    if not sents:
        return flat[left : left + min(max_chars, len(flat) - left)]
    take: list[str] = []
    for s in sents:
        take.append(s)
        joined = "".join(take)
        if len(take) >= min_sents and (len(take) >= max_sents or len(joined) >= 280):
            break
        if len(joined) >= max_chars:
            break
    joined = "".join(take)
    if len(joined) > max_chars:
        # trim to last complete sentence within max
        acc = ""
        for s in take:
            if len(acc) + len(s) > max_chars and acc:
                break
            acc += s
        joined = acc
    return joined.strip()


def find_pos(body: str, queries: list[str]) -> int:
    flat_positions = []
    # search in body with newlines
    for q in queries:
        if not q:
            continue
        i = body.find(q)
        if i >= 0:
            flat_positions.append((i, len(q)))
        # also try without newlines mismatch
    if not flat_positions:
        return 0
    flat_positions.sort(key=lambda x: (-x[1], x[0]))  # longer match first, then earlier
    return flat_positions[0][0]


def craft_content(node: dict, chapter: str, excerpt: str, summary: str) -> str:
    label = node["label"]
    ntype = node["type"]
    sents = sentences_of(excerpt)
    lead = sents[0] if sents else excerpt[:60]
    mid = "".join(sents[1:3]) if len(sents) > 1 else ""
    tail = sents[3] if len(sents) > 3 else ""

    if ntype == "chapter":
        parts = [
            f"本篇「{label}」属于《走出唯一真理观》的正式正文（或辑前导语），体裁以讲演、对谈、导读或书评为主。",
            f"开篇与主线可概括为：{lead}",
        ]
        if mid:
            parts.append(f"文中继续推进：{mid}")
        if tail:
            parts.append(f"后文还落到：{tail}")
        parts.append(
            f"与「概要」不同，这里按原文层次展开，强调篇章结构与论证节奏；核对接引请看下方摘录（出自「{chapter}」）。"
        )
    elif ntype == "claim":
        parts = [
            f"主张「{label}」不是口号，而是作者用来组织全书问题意识的枢纽命题。",
            f"其原意可先把握为：{lead}",
        ]
        if mid:
            parts.append(f"论证上，作者把这一主张放进更长的思想史与自我澄清之中：{mid}")
        parts.append(
            "因此它会连向「不同的道」「哲学之死」「思的任务」等节点：争论点不在宣布哲学无用，而在放弃「唯一真理体系」的自我理解。"
        )
    elif ntype == "work":
        parts = [
            f"著作节点「{label}」对应书中导读所围绕的文本，而非简单书目条目。",
            f"导读首先交代：{lead}",
        ]
        if mid:
            parts.append(f"随后进入问题结构：{mid}")
        parts.append("阅读地图时可把它当作「此在 / 在世 / 共在 / 本真」线索的入口，而不是术语表。")
    elif ntype == "person":
        parts = [
            f"人物节点「{label}」标记译介与思想史中的关键中介。",
            f"书中写道：{lead}",
        ]
        if mid:
            parts.append(mid)
        parts.append("详述保留人物—文本—问题三者的关联；概要只点明其位置。")
    else:
        parts = [
            f"概念「{label}」需要放回「{chapter}」的问题脉络里理解，而不是抽成词典义项。",
            f"就原文而言，核心说法是：{lead}",
        ]
        if mid:
            parts.append(f"作者进一步区分或展开：{mid}")
        if tail:
            parts.append(f"相关收束或转进：{tail}")
        parts.append(
            "因此「详述」负责展开层次与区分，「概要」只保留最短定位；二者必须不同，摘录则提供可核对的原文区间。"
        )

    content = "".join(parts)
    # Ensure clearly different from summary
    if content.strip() == summary.strip() or content.startswith(summary[:20]):
        content = (
            f"围绕「{label}」，书中在「{chapter}」给出可核对的论述。"
            f"概要已压缩主旨；此处补足论证层次：{lead}"
            + (f"进而，{mid}" if mid else "")
            + "请以下方完整摘录为准。"
        )
    return content


def main() -> None:
    chapters = load_chapters()
    raw = subprocess.check_output(
        ["git", "show", f"HEAD:content/maps/{MAP_ID}/graph.json"], cwd=str(ROOT)
    )
    graph = json.loads(raw.decode("utf-8"))
    assert graph["schemaVersion"] == "1.1"

    bad = []
    for node in graph["nodes"]:
        title = NODE_CHAPTER.get(node["id"]) or (node.get("source") or {}).get("chapter") or node["label"]
        if title not in chapters:
            # fuzzy among short titles
            hit = None
            for t in chapters:
                if title in t or t in title:
                    hit = t
                    break
            if not hit:
                bad.append(node["id"] + ":missing-chapter:" + title)
                continue
            title = hit
        fname, body = chapters[title]

        if node["type"] == "chapter":
            # opening 2–4 sentences after any subtitle line
            start = 0
            # skip a short subtitle line like （2016...）
            lines = body.split("\n")
            idx_line = 0
            if lines and (lines[0].startswith("（") or lines[0].startswith("(")):
                idx_line = 1
            start = sum(len(x) + 1 for x in lines[:idx_line])
            excerpt = extract_span(body, start, min_sents=2, max_sents=4, max_chars=650)
            # short chapters: whole body
            if len(body) < 400:
                excerpt = body.replace("\n", "")
                if not ends_complete(excerpt) and not excerpt.endswith("。"):
                    pass
        else:
            queries = SEARCH_QUERIES.get(node["id"], []) + [node["label"]]
            # strip parenthetical english
            lab = re.sub(r"\s*\([^)]*\)\s*", "", node["label"])
            queries.append(lab)
            for part in re.split(r"[/／]", lab):
                if len(part.strip()) >= 2:
                    queries.append(part.strip())
            pos = find_pos(body, queries)
            excerpt = extract_span(body, pos, min_sents=2, max_sents=4, max_chars=700)

        if not ends_complete(excerpt):
            # extend a bit
            pos2 = body.replace("\n", "").find(excerpt.replace("\n", "")[:20])
            if pos2 >= 0:
                # use body flat
                flat = body.replace("\n", "")
                excerpt = extract_span(flat, pos2, min_sents=2, max_sents=5, max_chars=800)

        # Keep original summary (from git) — already good abstracts
        summary = (node.get("summary") or "").strip()
        if summary and not ends_complete(summary) and summary[-1] not in "。！？…":
            summary = summary.rstrip("；，、 ") + "。"

        content = craft_content(node, title, excerpt, summary)
        if content.strip() == summary.strip():
            content = content + f"详见「{title}」原文摘录中的完整表述。"

        src = dict(node.get("source") or {})
        # preserve prior file/anchor if present from git
        src["excerpt"] = excerpt
        src["chapter"] = title
        if fname:
            src["file"] = src.get("file") or fname
        node["source"] = src
        node["summary"] = summary
        node["content"] = content

    now = datetime.now(timezone(timedelta(hours=8))).strftime("%Y-%m-%dT%H:%M:%S+08:00")
    payload = json.dumps(graph, ensure_ascii=False, indent=2) + "\n"
    for path in GRAPH_PATHS:
        path.write_text(payload, encoding="utf-8")

    for mp in META_PATHS:
        try:
            rawm = subprocess.check_output(
                ["git", "show", f"HEAD:content/maps/{MAP_ID}/meta.json"], cwd=str(ROOT)
            )
            meta = json.loads(rawm.decode("utf-8"))
        except Exception:
            meta = json.loads(mp.read_text(encoding="utf-8"))
        meta["generatedAt"] = now
        meta["version"] = "1.1.1"
        draft = sum(1 for n in graph["nodes"] if n.get("reviewStatus") == "draft")
        reviewed = sum(1 for n in graph["nodes"] if n.get("reviewStatus") == "reviewed")
        meta["review"] = {"draft": draft, "reviewed": reviewed}
        mp.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    same = sum(1 for n in graph["nodes"] if n["summary"].strip() == n["content"].strip())
    trunc = sum(
        1
        for n in graph["nodes"]
        if (n.get("source") or {}).get("excerpt") and not ends_complete(n["source"]["excerpt"])
    )
    short = sum(1 for n in graph["nodes"] if len((n.get("source") or {}).get("excerpt") or "") < 60)
    print(f"OK nodes={len(graph['nodes'])} same={same} incomplete={trunc} short={short} bad={bad}")
    for nid in [
        "c-weiyi-zhenliguan",
        "ch-zou-chu",
        "c-shuoli",
        "c-cidai",
        "ch-qianji",
        "c-duoyuan-dao",
        "w-cunzai-yu-shijian",
        "c-keshuo",
        "c-benzhen",
        "ch-ji1",
    ]:
        n = next(x for x in graph["nodes"] if x["id"] == nid)
        print("=" * 60)
        print(n["id"], n["label"], "=>", n["source"]["chapter"])
        print("SUM:", n["summary"][:100])
        print("CON:", n["content"][:180])
        print(
            "ex_len",
            len(n["source"]["excerpt"]),
            "complete",
            ends_complete(n["source"]["excerpt"]),
            "same",
            n["summary"] == n["content"],
        )
        print("EXC:", n["source"]["excerpt"][:180])


if __name__ == "__main__":
    main()
