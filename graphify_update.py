from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
from pathlib import Path

from graphify.analyze import god_nodes, suggest_questions, surprising_connections
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.diagnostics import diagnose_extraction, format_diagnostic_report
from graphify.export import to_html, to_json
from graphify.report import generate
from graphify.validate import validate_extraction

KNOWN_TERMS = (
    "Supabase", "DOKU", "Vercel", "Hono", "Express", "Prisma", "PostgreSQL",
    "Deno", "TypeScript", "JavaScript", "React", "Next.js", "Webhook", "REST",
    "API", "JWT", "RLS", "OAuth", "HTTPS", "Edge Function", "Serverless",
    "Vercel", "WhatsApp", "YOLO", "BoT-SORT", "Roblox", "WCAG", "Mobile-First",
)


def _relative(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def _slug(value: str) -> str:
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE).strip().lower()
    return re.sub(r"[-\s]+", "-", value) or "root"


def _line_number(text: str, fragment: str) -> int:
    index = text.find(fragment)
    return text.count("\n", 0, index) + 1 if index >= 0 else 1


def _clean_term(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip(" `*_\t\r\n|:-"))
    value = re.sub(r"^[^\w]+|[^\w)\].+]+$", "", value, flags=re.UNICODE)
    if len(value) < 2 or len(value) > 80 or value.lower() in {"and", "atau", "dan", "the", "untuk"}:
        return ""
    return value


def _terms(text: str) -> list[str]:
    candidates = re.findall(r"`([^`\n]+)`|\*\*([^*\n]+)\*\*", text)
    values = [part for pair in candidates for part in pair if part]
    for line in text.splitlines():
        if "|" in line and not re.fullmatch(r"\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*", line):
            values.extend(line.split("|"))
    values.extend(term for term in KNOWN_TERMS if re.search(re.escape(term), text, re.IGNORECASE))
    found: dict[str, str] = {}
    for value in values:
        term = _clean_term(value)
        if term:
            found.setdefault(term.casefold(), term)
    return sorted(found.values(), key=str.casefold)


def _markdown_files(root: Path) -> list[Path]:
    return sorted(
        path for path in root.rglob("*.md")
        if "graphify-out" not in path.parts and not any(part.startswith(".") for part in path.relative_to(root).parts)
    )


def extract_markdown(root: Path) -> dict:
    root = root.resolve()
    nodes: dict[str, dict] = {}
    edges: dict[tuple[str, str, str, str], dict] = {}
    concept_sources: dict[str, tuple[str, int, str]] = {}

    def add_node(node: dict) -> None:
        nodes.setdefault(node["id"], node)

    def add_edge(source: str, target: str, relation: str, source_file: str, confidence: str = "EXTRACTED") -> None:
        if source == target:
            return
        key = (source, target, relation, source_file)
        edges.setdefault(key, {
            "source": source,
            "target": target,
            "relation": relation,
            "confidence": confidence,
            "source_file": source_file,
            "_origin": "semantic",
        })

    for path in _markdown_files(root):
        relative = _relative(path, root)
        text = path.read_text(encoding="utf-8")
        document_id = f"document:{relative}"
        add_node({
            "id": document_id,
            "label": path.stem,
            "file_type": "document",
            "source_file": relative,
            "source_location": "L1",
            "_origin": "semantic",
        })
        headings = list(re.finditer(r"^(#{1,6})\s+(.+?)\s*#*\s*$", text, re.MULTILINE))
        parent = document_id
        for match in headings:
            line = text.count("\n", 0, match.start()) + 1
            title = _clean_term(match.group(2)) or f"Untitled section L{line}"
            section_id = f"section:{relative}#{_slug(title)}-{match.start()}"
            add_node({
                "id": section_id,
                "label": title,
                "file_type": "concept",
                "source_file": relative,
                "source_location": f"L{line}",
                "_origin": "semantic",
            })
            add_edge(parent, section_id, "contains", relative)
            parent = section_id

        for term in _terms(text):
            key = term.casefold()
            if key not in concept_sources:
                concept_sources[key] = (relative, _line_number(text, term), term)
                add_node({
                    "id": f"concept:{_slug(term)}",
                    "label": term,
                    "file_type": "concept",
                    "source_file": relative,
                    "source_location": f"L{concept_sources[key][1]}",
                    "_origin": "semantic",
                })
            concept_id = f"concept:{_slug(term)}"
            add_edge(document_id, concept_id, "mentions", relative)
            if headings:
                section = next((m for m in headings if m.start() <= text.find(term) < m.end()), None)
                if section is not None:
                    section_line = text.count("\n", 0, section.start()) + 1
                    title = _clean_term(section.group(2)) or f"Untitled section L{section_line}"
                    add_edge(f"section:{relative}#{_slug(title)}-{section.start()}", concept_id, "mentions", relative)

        for target in re.findall(r"\[[^]]+\]\(([^)]+\.md)(?:#[^)]+)?\)", text, re.IGNORECASE):
            target_path = (path.parent / target.split("#", 1)[0]).resolve()
            if target_path.is_file() and target_path.suffix.lower() == ".md":
                add_edge(document_id, f"document:{_relative(target_path, root)}", "references", relative, "INFERRED")

    extraction = {
        "nodes": list(nodes.values()),
        "edges": list(edges.values()),
        "hyperedges": [],
        "input_tokens": 0,
        "output_tokens": 0,
    }
    errors = validate_extraction(extraction)
    if errors:
        raise ValueError("Invalid extraction: " + "; ".join(errors))
    return extraction


def _detection(root: Path, files: list[Path]) -> dict:
    words = sum(len(path.read_text(encoding="utf-8").split()) for path in files)
    relative = [_relative(path, root) for path in files]
    return {
        "scan_root": str(root),
        "total_files": len(files),
        "total_words": words,
        "files": {"document": relative},
        "all_files": {"document": relative},
        "skipped_sensitive": [],
    }


def _labels(graph, communities: dict[int, list[str]]) -> dict[int, str]:
    result = {}
    for community_id, members in communities.items():
        labels = [str(graph.nodes[node].get("label", node)) for node in members]
        labels = [label for label in labels if not label.startswith(("PRD", "DESIGN", "TECH"))]
        result[community_id] = " / ".join(labels[:2]) or f"Community {community_id}"
    return result


def build(root: Path) -> dict:
    root = root.resolve()
    output = root / "graphify-out"
    output.mkdir(exist_ok=True)
    files = _markdown_files(root)
    extraction = extract_markdown(root)
    graph = build_from_json(extraction, root=root, directed=True)
    if graph.number_of_nodes() == 0:
        raise RuntimeError("Graph is empty")

    communities = cluster(graph)
    cohesion = score_all(graph, communities)
    labels = _labels(graph, communities)
    detection = _detection(root, files)
    gods = god_nodes(graph)
    surprises = surprising_connections(graph, communities)
    questions = suggest_questions(graph, communities, labels)
    health = diagnose_extraction(extraction, directed=True, root=root)
    tokens = {"input": 0, "output": 0}

    to_json(graph, communities, str(output / "graph.json"), force=True, community_labels=labels)
    to_html(graph, communities, str(output / "graph.html"), community_labels=labels)
    report = generate(
        graph, communities, cohesion, labels, gods, surprises, detection, tokens,
        str(root), suggested_questions=questions,
    )
    (output / "GRAPH_REPORT.md").write_text(report, encoding="utf-8")
    (output / ".graphify_extract.json").write_text(json.dumps(extraction, indent=2, ensure_ascii=False), encoding="utf-8")
    (output / ".graphify_analysis.json").write_text(json.dumps({
        "communities": {str(k): v for k, v in communities.items()},
        "cohesion": {str(k): v for k, v in cohesion.items()},
        "labels": {str(k): v for k, v in labels.items()},
        "gods": gods,
        "surprises": surprises,
        "questions": questions,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    (output / ".graphify_diagnostics.json").write_text(json.dumps(health, indent=2, ensure_ascii=False), encoding="utf-8")
    (output / ".graphify_detect.json").write_text(json.dumps(detection, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Graph: {graph.number_of_nodes()} nodes, {graph.number_of_edges()} edges, {len(communities)} communities")
    print(format_diagnostic_report(health))
    print(f"Outputs: {output}")
    return {"nodes": graph.number_of_nodes(), "edges": graph.number_of_edges(), "files": len(files)}


def _fingerprint(root: Path) -> str:
    digest = hashlib.sha256()
    for path in _markdown_files(root):
        stat = path.stat()
        digest.update(f"{path}:{stat.st_mtime_ns}:{stat.st_size}".encode())
    return digest.hexdigest()


def watch(root: Path, interval: float) -> None:
    previous = ""
    while True:
        current = _fingerprint(root)
        if current != previous:
            build(root)
            previous = current
        time.sleep(interval)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local deterministic Graphify outputs from Markdown.")
    parser.add_argument("command", nargs="?", choices=("build", "watch"), default="build")
    parser.add_argument("--root", type=Path, default=Path(__file__).parent)
    parser.add_argument("--interval", type=float, default=1.0)
    parser.add_argument("--once", action="store_true", help="Build once, including with watch command.")
    args = parser.parse_args()
    if args.command == "watch" and not args.once:
        watch(args.root.resolve(), args.interval)
    else:
        build(args.root.resolve())


if __name__ == "__main__":
    main()
