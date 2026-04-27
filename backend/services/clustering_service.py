# -----------------------------------------------------------------------------
# services/clustering_service.py - Smart Question Clustering via Embeddings
# -----------------------------------------------------------------------------
#
# WHAT IS THIS?
#   Groups similar customer questions together using OpenAI embeddings.
#   Reads the ACTUAL ticket content (first user message), not just subjects,
#   to understand that "How do I get a refund?" and "I want my money back"
#   are the same topic.
#
# HOW IT WORKS:
#   1. Takes ticket data (subject + first message content) from the date range
#   2. Converts each ticket's content to a vector using text-embedding-3-small
#   3. Uses greedy cosine-similarity clustering to group similar ones
#   4. Uses GPT-4o-mini to generate a smart cluster title from the content
#   5. Returns top N clusters sorted by frequency
# -----------------------------------------------------------------------------

import numpy as np
from openai import OpenAI
from core.config import settings


def cluster_questions(ticket_data: list, top_n: int = 8) -> list[dict]:
    """
    Group similar tickets into clusters using content-based embeddings.

    Args:
        ticket_data: List of dicts with 'subject' and 'content' keys,
                     OR list of plain strings (backward compatibility)
        top_n: Max number of clusters to return

    Returns:
        List of dicts: [{"question": "...", "count": 12, "summary": "..."}, ...]
    """
    if not ticket_data:
        return []

    # Handle both old format (list of strings) and new format (list of dicts)
    if isinstance(ticket_data[0], str):
        items = [{"subject": s, "content": s} for s in ticket_data]
    else:
        items = ticket_data

    # Build embedding text: combine subject + content for richer understanding
    # Truncate content to avoid token limits
    embed_texts = []
    for item in items:
        subject = item.get("subject", "").strip()
        content = item.get("content", "").strip()
        # Use content primarily, fall back to subject
        text = content[:500] if content else subject[:200]
        embed_texts.append(text)

    # Deduplicate similar texts to save embedding costs
    text_to_indices = {}
    for i, t in enumerate(embed_texts):
        key = t.strip().lower()[:150]
        if key not in text_to_indices:
            text_to_indices[key] = []
        text_to_indices[key].append(i)

    unique_texts = list(text_to_indices.keys())
    unique_counts = {k: len(v) for k, v in text_to_indices.items()}

    # If very few unique texts, skip embeddings
    if len(unique_texts) <= top_n:
        result = []
        for t in sorted(unique_texts, key=lambda x: unique_counts[x], reverse=True):
            # Get a representative item for display
            rep_idx = text_to_indices[t][0]
            result.append({
                "question": items[rep_idx]["subject"].capitalize() or t[:80].capitalize(),
                "count": unique_counts[t],
                "summary": items[rep_idx]["subject"].capitalize() or t[:80].capitalize(),
                "members_content": [t],
            })
        # Generate LLM summaries even for small sets
        result = _generate_summaries(result)
        return result[:top_n]

    # Get embeddings from OpenAI
    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=unique_texts,
        )
        vectors = [item.embedding for item in response.data]
    except Exception as e:
        print(f"[clustering] Embedding failed: {e}")
        # Fallback: return simple frequency counts
        result = []
        for t in sorted(unique_texts, key=lambda x: unique_counts[x], reverse=True):
            rep_idx = text_to_indices[t][0]
            result.append({
                "question": items[rep_idx]["subject"].capitalize() or t[:80].capitalize(),
                "count": unique_counts[t],
                "summary": items[rep_idx]["subject"].capitalize() or t[:80].capitalize(),
            })
        return result[:top_n]

    # Greedy cosine-similarity clustering
    clusters = _greedy_cluster(unique_texts, vectors, unique_counts, text_to_indices, items, threshold=0.72)

    # Sort by total count, take top N
    clusters.sort(key=lambda c: c["count"], reverse=True)
    top_clusters = clusters[:top_n]

    # Generate AI summaries for each cluster
    top_clusters = _generate_summaries(top_clusters)

    return top_clusters


def _greedy_cluster(
    texts: list[str],
    vectors: list[list[float]],
    counts: dict,
    text_to_indices: dict,
    items: list[dict],
    threshold: float = 0.72,
) -> list[dict]:
    """
    Simple greedy clustering: assign each text to the first cluster
    whose centroid is within the cosine similarity threshold.
    """
    vecs = np.array(vectors)
    # Normalize for cosine similarity
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms[norms == 0] = 1
    vecs_normed = vecs / norms

    clusters = []
    assigned = set()

    for i in range(len(texts)):
        if i in assigned:
            continue

        # Start a new cluster with this text
        cluster_indices = [i]
        assigned.add(i)

        # Find all unassigned texts similar to this one
        for j in range(i + 1, len(texts)):
            if j in assigned:
                continue
            sim = float(np.dot(vecs_normed[i], vecs_normed[j]))
            if sim >= threshold:
                cluster_indices.append(j)
                assigned.add(j)

        # Total count across all members
        total_count = sum(counts.get(texts[idx], 0) for idx in cluster_indices)

        # Pick the most common text's subject as the display label
        best_idx = max(cluster_indices, key=lambda idx: counts.get(texts[idx], 0))
        rep_item_idx = text_to_indices[texts[best_idx]][0]

        # Collect content samples for LLM summary (up to 10)
        member_contents = []
        for idx in cluster_indices[:10]:
            member_contents.append(texts[idx][:300])

        clusters.append({
            "question": items[rep_item_idx]["subject"].capitalize() or texts[best_idx][:80].capitalize(),
            "count": total_count,
            "members_content": member_contents,
        })

    return clusters


def _generate_summaries(clusters: list[dict]) -> list[dict]:
    """
    Use GPT-4o-mini to generate a smart, descriptive cluster title
    by reading the actual ticket content - not just subjects.
    """
    if not clusters:
        return clusters

    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        for cluster in clusters:
            members = cluster.get("members_content", [])
            if len(members) <= 1 and cluster.get("question"):
                # Single item - still generate a clean summary from content
                content = members[0] if members else cluster["question"]
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{
                        "role": "user",
                        "content": (
                            "Read this customer support message and write a SHORT topic label "
                            "(max 8 words) that describes what the customer needs help with. "
                            "Do not use quotes. Be specific.\n\n"
                            f"Message: {content[:400]}"
                        )
                    }],
                    max_tokens=30,
                    temperature=0.2,
                )
                cluster["summary"] = response.choices[0].message.content.strip()
                cluster.pop("members_content", None)
                continue

            # Multiple items - summarize the common theme
            content_text = "\n---\n".join(m[:300] for m in members[:8])

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{
                    "role": "user",
                    "content": (
                        "Below are several customer support messages that are about similar issues. "
                        "Read them carefully and write a SHORT topic label (max 8 words) that "
                        "describes the common issue or question. Be specific and descriptive. "
                        "Do not use quotes.\n\n"
                        f"{content_text}"
                    )
                }],
                max_tokens=30,
                temperature=0.2,
            )
            cluster["summary"] = response.choices[0].message.content.strip()

            # Clean up - don't send raw content to frontend
            cluster.pop("members_content", None)

    except Exception as e:
        print(f"[clustering] Summary generation failed: {e}")
        for cluster in clusters:
            cluster["summary"] = cluster.get("question", "Unknown topic")
            cluster.pop("members_content", None)

    return clusters
