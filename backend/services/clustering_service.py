# -----------------------------------------------------------------------------
# services/clustering_service.py — Smart Question Clustering via Embeddings
# -----------------------------------------------------------------------------
#
# WHAT IS THIS?
#   Groups similar customer questions together using OpenAI embeddings.
#   Instead of just counting exact matches, it understands that
#   "How do I get a refund?" and "I want my money back" are the same topic.
#
# HOW IT WORKS:
#   1. Takes all ticket subjects from the date range
#   2. Converts each to a vector using text-embedding-3-small
#   3. Uses greedy cosine-similarity clustering to group similar ones
#   4. Labels each cluster with the most representative question
#   5. Returns top N clusters sorted by frequency
# -----------------------------------------------------------------------------

import numpy as np
from openai import OpenAI
from core.config import settings


def cluster_questions(subjects: list[str], top_n: int = 8) -> list[dict]:
    """
    Group similar ticket subjects into clusters using embeddings.

    Args:
        subjects: List of ticket subject strings
        top_n: Max number of clusters to return

    Returns:
        List of dicts: [{"question": "refund policy", "count": 12}, ...]
    """
    if not subjects:
        return []

    # Deduplicate while preserving counts
    subject_counts = {}
    for s in subjects:
        key = s.strip().lower()[:100]
        subject_counts[key] = subject_counts.get(key, 0) + 1

    unique_subjects = list(subject_counts.keys())

    # If very few unique subjects, skip embeddings — just return counts
    if len(unique_subjects) <= top_n:
        result = [
            {"question": s.capitalize(), "count": subject_counts[s]}
            for s in sorted(unique_subjects, key=lambda x: subject_counts[x], reverse=True)
        ]
        return result[:top_n]

    # Get embeddings from OpenAI
    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.embeddings.create(
            model="text-embedding-3-small",
            input=unique_subjects,
        )
        vectors = [item.embedding for item in response.data]
    except Exception as e:
        print(f"[clustering] Embedding failed: {e}")
        # Fallback: return simple frequency counts
        result = [
            {"question": s.capitalize(), "count": subject_counts[s]}
            for s in sorted(unique_subjects, key=lambda x: subject_counts[x], reverse=True)
        ]
        return result[:top_n]

    # Greedy cosine-similarity clustering
    clusters = _greedy_cluster(unique_subjects, vectors, subject_counts, threshold=0.75)

    # Sort by total count, take top N
    clusters.sort(key=lambda c: c["count"], reverse=True)
    return clusters[:top_n]


def _greedy_cluster(
    subjects: list[str],
    vectors: list[list[float]],
    counts: dict,
    threshold: float = 0.75,
) -> list[dict]:
    """
    Simple greedy clustering: assign each subject to the first cluster
    whose centroid is within the cosine similarity threshold.
    """
    vecs = np.array(vectors)
    # Normalize for cosine similarity
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms[norms == 0] = 1
    vecs_normed = vecs / norms

    clusters = []  # Each: {"centroid_idx": int, "members": [indices], "label": str}
    assigned = set()

    for i in range(len(subjects)):
        if i in assigned:
            continue

        # Start a new cluster with this subject
        cluster_indices = [i]
        assigned.add(i)

        # Find all unassigned subjects similar to this one
        for j in range(i + 1, len(subjects)):
            if j in assigned:
                continue
            sim = float(np.dot(vecs_normed[i], vecs_normed[j]))
            if sim >= threshold:
                cluster_indices.append(j)
                assigned.add(j)

        # Pick the most common subject as the cluster label
        best_label = max(cluster_indices, key=lambda idx: counts.get(subjects[idx], 0))
        total_count = sum(counts.get(subjects[idx], 0) for idx in cluster_indices)

        clusters.append({
            "question": subjects[best_label].capitalize(),
            "count": total_count,
        })

    return clusters
