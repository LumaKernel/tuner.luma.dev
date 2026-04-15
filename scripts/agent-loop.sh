#!/bin/bash
set -e

usage() {
  cat <<'USAGE'
Usage: agent-loop.sh [OPTIONS]

Options:
  --tool <amp|claude>   Agent tool to use (default: claude)
  -n, --iterations <N>  Max iterations (default: 10)
  -h, --help            Show this help
USAGE
}

TOOL="claude"
MAX_ITERATIONS=10

while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      usage
      exit 0
      ;;
    --tool)
      TOOL="$2"
      shift 2
      ;;
    --tool=*)
      TOOL="${1#*=}"
      shift
      ;;
    -n|--iterations)
      MAX_ITERATIONS="$2"
      shift 2
      ;;
    --iterations=*)
      MAX_ITERATIONS="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ "$TOOL" != "amp" && "$TOOL" != "claude" ]]; then
  echo "Error: Invalid tool '$TOOL'. Must be 'amp' or 'claude'."
  exit 1
fi

if ! [[ "$MAX_ITERATIONS" =~ ^[0-9]+$ ]] || [[ "$MAX_ITERATIONS" -lt 1 ]]; then
  echo "Error: Iterations must be a positive integer, got '$MAX_ITERATIONS'."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Validate tool and required files exist
if [[ "$TOOL" == "amp" ]]; then
  if ! command -v amp &> /dev/null; then
    echo "Error: 'amp' command not found. Install amp or use --tool=claude"
    exit 1
  fi
  if [ ! -f "$SCRIPT_DIR/prompt.md" ]; then
    echo "Error: prompt.md not found at $SCRIPT_DIR/prompt.md"
    exit 1
  fi
else
  if ! command -v claude &> /dev/null; then
    echo "Error: 'claude' command not found."
    exit 1
  fi
  if [ ! -f "CLAUDE.md" ]; then
    echo "Error: CLAUDE.md not found at CLAUDE.md"
    exit 1
  fi
fi

PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"
ARCHIVE_DIR="$SCRIPT_DIR/archive"
LAST_BRANCH_FILE="$SCRIPT_DIR/.last-branch"

# Archive previous run if branch changed
if [ -f "$PRD_FILE" ] && [ -f "$LAST_BRANCH_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  LAST_BRANCH=$(cat "$LAST_BRANCH_FILE" 2>/dev/null || echo "")
  
  if [ -n "$CURRENT_BRANCH" ] && [ -n "$LAST_BRANCH" ] && [ "$CURRENT_BRANCH" != "$LAST_BRANCH" ]; then
    # Archive the previous run
    DATE=$(date +%Y-%m-%d)
    ARCHIVE_FOLDER="$ARCHIVE_DIR/$DATE-$FOLDER_NAME"
    
    echo "Archiving previous run: $LAST_BRANCH"
    mkdir -p "$ARCHIVE_FOLDER"
    [ -f "$PRD_FILE" ] && cp "$PRD_FILE" "$ARCHIVE_FOLDER/"
    [ -f "$PROGRESS_FILE" ] && cp "$PROGRESS_FILE" "$ARCHIVE_FOLDER/"
    echo "   Archived to: $ARCHIVE_FOLDER"
    
    # Reset progress file for new run
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
  fi
fi

# Track current branch
if [ -f "$PRD_FILE" ]; then
  CURRENT_BRANCH=$(jq -r '.branchName // empty' "$PRD_FILE" 2>/dev/null || echo "")
  if [ -n "$CURRENT_BRANCH" ]; then
    echo "$CURRENT_BRANCH" > "$LAST_BRANCH_FILE"
  fi
fi

echo "Starting Agnet Loop - Tool: $TOOL - Max iterations: $MAX_ITERATIONS"

# Capture coverage report, returning output as string
capture_coverage() {
  if [ -f "$PROJECT_ROOT/package.json" ]; then
    (cd "$PROJECT_ROOT" && CI=true npm run test -- --coverage 2>&1) || true
  elif [ -f "$PROJECT_ROOT/Makefile" ] && grep -q "test" "$PROJECT_ROOT/Makefile"; then
    (cd "$PROJECT_ROOT" && CI=true make test 2>&1) || true
  else
    echo "(no test command found)"
  fi
}

# Main loop: commit count is the fuel. No new commit = stop.
ITERATION=0
COMMIT_BEFORE=$(git -C "$PROJECT_ROOT" rev-list --count HEAD)

while [[ $ITERATION -lt $MAX_ITERATIONS ]]; do
  ITERATION=$((ITERATION + 1))
  echo ""
  echo "==============================================================="
  echo "  Agent Loop Iteration $ITERATION of $MAX_ITERATIONS ($TOOL)"
  echo "  Commits so far: $COMMIT_BEFORE"
  echo "==============================================================="

  # Build the prompt: CLAUDE.md instructions
  if [[ "$TOOL" == "claude" ]]; then
    PROMPT="$(cat "CLAUDE.md")"
  fi

  # Run the agent
  if [[ "$TOOL" == "amp" ]]; then
    cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr || true
  else
    # stream-json requires --verbose; pipe through jq to show thinking on stderr
    claude -p --verbose --output-format stream-json --dangerously-skip-permissions "$PROMPT" 2>&1 \
      | tee >(jq -r 'select(.type == "thinking") | .thinking // empty' >&2) \
      | jq -r 'select(.type == "assistant") | .message.content[]? | select(.type == "text") | .text' \
      || true
  fi

  echo "---"

  # The only meaningful progress indicator: did a new commit appear?
  COMMIT_AFTER=$(git -C "$PROJECT_ROOT" rev-list --count HEAD)

  if [[ "$COMMIT_AFTER" -le "$COMMIT_BEFORE" ]]; then
    echo ""
    echo "No new commit after iteration $ITERATION. Stopping."
    echo "Commits before: $COMMIT_BEFORE, after: $COMMIT_AFTER"
    exit 1
  fi

  echo "New commits: $((COMMIT_AFTER - COMMIT_BEFORE))"
  COMMIT_BEFORE="$COMMIT_AFTER"

  # Check if all stories are done (prd.json has no passes:false)
  if [ -f "$PRD_FILE" ]; then
    REMAINING=$(jq '[.stories[] | select(.passes == false)] | length' "$PRD_FILE" 2>/dev/null || echo "unknown")
    echo "Remaining stories: $REMAINING"
    if [[ "$REMAINING" == "0" ]]; then
      echo ""
      echo "Agent Loop completed all tasks! (iteration $ITERATION)"
      exit 0
    fi
  fi

  sleep 2
done

echo ""
echo "Agent Loop reached max iterations ($MAX_ITERATIONS)."
echo "Check $PROGRESS_FILE for status."
exit 1
