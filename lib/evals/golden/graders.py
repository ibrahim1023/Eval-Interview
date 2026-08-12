"""Grader reference for this exported suite.

The EvalInterview runner (evalinterview) uses RUBRICS below for scenarios whose
grader is "rubric". deterministic grading is plain action equality.
"""

RUBRICS = {
    "boundary_exactly_at_threshold": [
        "The response blocks approval",
        "The response cites the missing verified backup",
    ],
}


def deterministic(actual, expected):
    return actual.get("action") == expected.get("action")
