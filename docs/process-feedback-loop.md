# Process Feedback Loop: Dumping and What to Do

This document describes the feedback-loop design between **Dumping** and **What to do**, so that a mismatch between the AI suggestion and the user's actual context is treated as a **context-design issue** and leads back to Dumping or context reinforcement, not to a dead end.

## Design Intent

- **One-way flow was insufficient**: Dumping → What to do was linear. When the AI's "What to do" suggestion did not match the user's context, there was no explicit path to correct it.
- **Feedback loop**: The process is modeled as a **state machine with feedback**. If the result is off, the user can go back to Dumping (or reinforce context) and try again.
- **Meta-check**: The user can explicitly ask "Did the AI suggestion match my context?" and, if not, choose to return to Dumping.

## State Transitions

| From     | To           | Condition / Label              |
|----------|--------------|--------------------------------|
| Dumping  | WhatToDo     | thoughts organized             |
| WhatToDo | DefiningIntent | action intent clear           |
| **WhatToDo** | **Dumping** | **context insufficient**       |

The backward transition **WhatToDo → Dumping** is the feedback path. It is triggered when the user answers "No" to:

> "AI가 제안한 '하고 싶은 일'이 당신의 실제 맥락과 일치하나요?"

## Flow Within WhatToDo

1. User writes "what I want to do" (possibly with AI help using Dumping content).
2. **Context-match check**: "Does the AI-suggested 'what to do' match your actual context?"
   - **Yes** → Proceed to "Is the action intent clear?" and then to DefiningIntent or re-answer.
   - **No** → Transition to **Dumping** to add or refine context, then return to WhatToDo again.

So the flow is no longer strictly linear: **Dumping ↔ WhatToDo** forms a loop until the user is satisfied that the suggestion matches their context.

## Rationale

- **Context is often incomplete**: Outputs from Dumping are not guaranteed to be complete; missing context can lead to misaligned "What to do" suggestions.
- **Mismatch = input design**: If the AI suggestion is wrong, the cause is often **insufficient or unclear context**, not only the model. The process makes "go back and improve context" the default response.
- **Explicit meta-check**: The user is prompted to judge whether the suggestion matches their context. That judgment is part of the process and is supported by a visible path (back to Dumping).
- **Learning and reproducibility**: Treating mismatch as "context insufficient" and looping back makes the process repeatable and improves the reliability of the thinking tool over time.

## Extension to Other AI Prompts

The same idea can be applied elsewhere:

- For **any** step where an AI suggestion is produced, consider adding a **"Does this match my context?"** check.
- If the user says no, provide an **explicit path** back to the prior step that supplies context (e.g. Dumping or a "context reinforcement" step), rather than treating it as a final failure.

So: **every AI prompt result that can be "wrong" in terms of user context should have a defined way to go back and improve the inputs**, turning the process into a state machine with feedback rather than a one-way pipeline.

---

## In-Place Supplement and Go-Back (UX)

To reduce forced flow and support "judgment -> supplement -> retry" at each step:

- **Same-step go-back**: At every question step, when there is at least one valid go-back target (derived from state transitions), the UI shows a row: "AI 답변이 부족하거나 맥락이 맞지 않나요?" with buttons such as "Dumping으로 돌아가기" (or "WhatToDo로 돌아가기", etc.). The user can go back to a previous situation **without** having to answer and move to the next question first.
- **Re-ask without submitting**: When the current question has an AI prompt, the same row offers "입력 보완 후 다시 질문". Clicking it opens the prompt/context inputs so the user can supplement and generate a new prompt, then copy and use the result, **without** saving an answer or advancing. So the flow is no longer "answer -> next only"; it is "judgment -> supplement -> re-ask" or "go back" as first-class options.
- **No forced answer**: The user is not required to enter a formal answer to proceed; they can choose to go back or to re-ask at the same step. This keeps the tool from blocking the user's thinking and supports natural iteration.
