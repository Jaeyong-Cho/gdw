# Improvement Recommendation Feature

## Overview

During the Learned phase, the system now provides AI-powered recommendations for the next item to improve from the Feedback + Issue list. The recommendation is scored based on whether items are **essential features** (must-have, core functionality) or **modifiable features** (nice-to-have, can be changed).

## Implementation

### 1. New Question Flow in Learned Phase

After identifying improvements, users can now:

1. **List Feedback and Issues** (`learned-feedback-issues-list`)
   - Type: `list` (multiple items)
   - Users enter feedback items and issues as separate list entries
   - Each item can be individually added/removed

2. **AI Recommendation** (`learned-next-improvement-recommendation`)
   - AI analyzes all feedback/issues
   - Scores each item based on essential vs. modifiable classification
   - Recommends the top priority item to improve next

### 2. Scoring Framework

The AI prompt uses a three-tier scoring system:

#### **Essential Features (High Priority: 8-10 points)**
- Core functionality that must work for the product to be usable
- Blocking issues that prevent users from achieving their goals
- Critical bugs or missing fundamental features
- Security or data integrity concerns
- Compliance or legal requirements

#### **Modifiable Features (Medium Priority: 4-7 points)**
- Enhancements that improve user experience but aren't critical
- Nice-to-have features that add value
- Performance optimizations
- UI/UX improvements
- Non-blocking bugs or edge cases

#### **Optional Features (Low Priority: 1-3 points)**
- Cosmetic changes
- Future enhancements
- Experimental features

### 3. AI Prompt Structure

The recommendation prompt analyzes:

**Input:**
- Feedback and Issues List (from `learned-feedback-issues-list`)
- Improvement Opportunities (from `learned-improvements-text`)
- Context: Intent, Problem, New Facts, Feedback

**Output:**
- Classification for each item (Essential/Modifiable/Optional)
- Score (1-10) with reasoning
- Ranked list by priority
- Top recommendation with detailed analysis

### 4. Workflow Integration

```
Learned Phase Flow:
├─ learned-new-facts → learned-new-facts-text
├─ learned-improvements → learned-improvements-text
├─ learned-feedback-issues-list (NEW - List input)
├─ learned-next-improvement-recommendation (NEW - AI analysis)
├─ learned-clear-implementation
└─ learned-next-action
```

## Usage Example

### Step 1: Enter Feedback/Issues List

User enters multiple items:
- "사용자 로그인이 실패하는 경우가 있음"
- "데이터 저장 속도가 느림"
- "UI 색상이 마음에 들지 않음"
- "보안 취약점 발견"

### Step 2: AI Analysis

AI analyzes and scores:
```
[사용자 로그인 실패] | Essential | 9/10 | Core functionality blocking user access
[보안 취약점] | Essential | 10/10 | Critical security issue
[데이터 저장 속도] | Modifiable | 6/10 | Performance enhancement
[UI 색상] | Optional | 2/10 | Cosmetic change
```

### Step 3: Recommendation

**Top Recommendation:**
- **Item:** 보안 취약점 발견
- **Classification:** Essential Feature
- **Score:** 10/10
- **Reasoning:** Critical security issue that must be addressed immediately. Security vulnerabilities can lead to data breaches and loss of user trust.
- **Next Steps:** 
  1. Identify the specific vulnerability
  2. Assess impact and exploitability
  3. Design security fix
  4. Implement and verify

## Technical Details

### Prompt Template

The AI prompt template (`learned-next-improvement-recommendation`) includes:

1. **Scoring Framework Definition**
   - Clear criteria for Essential/Modifiable/Optional
   - Point ranges for each category

2. **Analysis Tasks**
   - Classify each item
   - Score based on impact, urgency, effort/value ratio
   - Rank by priority
   - Recommend top item with detailed reasoning

3. **Output Format**
   - Structured format: `[Item] | [Classification] | [Score] | [Reasoning]`
   - Top recommendation with detailed analysis

### Data Flow

1. User enters list items in `learned-feedback-issues-list`
2. List is stored as JSON array: `["item1", "item2", "item3"]`
3. Prompt generator converts to bullet format: `- item1\n- item2\n- item3`
4. AI prompt receives formatted list + context
5. AI analyzes and provides recommendation
6. User reviews recommendation and proceeds

## Benefits

1. **Prioritization**: Helps focus on high-impact improvements first
2. **Objective Scoring**: Uses consistent criteria (essential vs. modifiable)
3. **Context-Aware**: Considers intent, problem, and feedback together
4. **Actionable**: Provides clear next steps for the recommended item
5. **Efficient**: Reduces decision paralysis by providing a clear recommendation

## Future Enhancements

Potential improvements:
- User can override AI recommendation with manual selection
- Historical tracking of improvement priorities
- Integration with task breakdown for recommended items
- Visual scoring dashboard
- Multi-criteria scoring (impact, effort, urgency, value)
