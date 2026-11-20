from pathlib import Path
from tempfile import TemporaryDirectory

from graphify_update import extract_markdown


with TemporaryDirectory() as temp:
    root = Path(temp)
    first = root / "one.md"
    second = root / "two.md"
    first.write_text("# One\nUses Supabase and DOKU.\n", encoding="utf-8")
    second.write_text("# Two\nUses Supabase.\n", encoding="utf-8")

    extraction = extract_markdown(root)

    assert len(extraction["nodes"]) >= 5
    assert any(node["label"] == "Supabase" for node in extraction["nodes"])
    assert any(edge["relation"] == "contains" for edge in extraction["edges"])
    assert any(edge["relation"] == "mentions" for edge in extraction["edges"])
    assert not any(edge["source"] == edge["target"] for edge in extraction["edges"])

print("graphify_update self-test: ok")
