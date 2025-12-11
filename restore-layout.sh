#!/bin/bash

SESSION="amp-dev"
DIR="$(pwd)"

# Check if we are already running inside the target session
CURRENT_SESSION=$(tmux display-message -p '#S' 2>/dev/null)
IS_RESTART=0

if [ "$CURRENT_SESSION" = "$SESSION" ]; then
    IS_RESTART=1
    # Rename the current session to avoid name collision
    tmux rename-session "${SESSION}_old"
else
    # Kill the session if it already exists to ensure a fresh start
    tmux kill-session -t $SESSION 2>/dev/null
fi

# 1. Create a new detached session
# Capture the ID of the first pane (Top-Left)
PANE_TOP_LEFT=$(tmux new-session -d -s $SESSION -n main -c "$DIR" -P -F "#{pane_id}")

if [ -z "$PANE_TOP_LEFT" ]; then
    echo "Error: Failed to create session"
    exit 1
fi

# 2. Create the Right Pane
# Split the Top-Left pane horizontally
PANE_RIGHT=$(tmux split-window -h -t "$PANE_TOP_LEFT" -c "$DIR" -P -F "#{pane_id}")

# 3. Create the Bottom-Left Pane
# Split the Top-Left pane vertically
PANE_BOT_LEFT=$(tmux split-window -v -t "$PANE_TOP_LEFT" -c "$DIR" -P -F "#{pane_id}")

# Give shells a moment to initialize
sleep 1

# 4. Send commands using explicit Pane IDs
# Pane 0 (Top-Left): ampc
# We add a delay to ensure the old session (and its amp instance) is killed before we start a new one
# This prevents lock contention on the amp database
tmux send-keys -t "$PANE_TOP_LEFT" "sleep 3; amp threads continue" C-m

# Pane 1 (Bottom-Left): zsh
# If we are restarting, schedule the cleanup of the old session here
if [ "$IS_RESTART" -eq 1 ]; then
    # We send this command to the shell in the new session to kill the old one
    # We wait 1s to ensure the client has fully switched to the new session
    tmux send-keys -t "$PANE_BOT_LEFT" "sleep 1; tmux kill-session -t ${SESSION}_old; clear" C-m
fi

# Pane 2 (Right): lazygit
tmux send-keys -t "$PANE_RIGHT" "lazygit" C-m

# 5. Apply layout
# Approximate 70/30 vertical split for left column
tmux resize-pane -t "$PANE_BOT_LEFT" -y 30%

# 6. Ensure focus is on the Top-Left pane
tmux select-pane -t "$PANE_TOP_LEFT"

# 7. Attach
if [ -n "$TMUX" ]; then
    tmux switch-client -t $SESSION
else
    tmux attach-session -t $SESSION
fi
