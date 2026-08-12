"""Grader reference for this exported suite."""

RUBRICS = {
    "boundary_block": [
        "The response blocks the refund",
    ],
}


def deterministic(actual, expected):
    return actual.get("action") == expected.get("action")
