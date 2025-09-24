#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Cleanup function ---
cleanup() {
    echo "\nCleaning up..."
    # Kill all background processes started by this script
    if [ -n "$BACKEND_PID" ]; then
        echo "Stopping backend server (PID: $BACKEND_PID)..."
        kill $BACKEND_PID
    fi
    if [ -n "$FRONTEND_PID" ]; then
        echo "Stopping frontend server (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID
    fi
    echo "Cleanup complete."
}

# Trap EXIT signal to ensure cleanup runs
trap cleanup EXIT

# --- Backend tests ---

echo "--- Starting Backend Test Suite ---"

cd backend

echo "Starting backend server in background..."
npm start &
BACKEND_PID=$!

echo "Waiting for backend server to be ready (PID: $BACKEND_PID)..."

# Wait for the health check to pass
RETRY_COUNT=0
MAX_RETRIES=15
until $(curl --output /dev/null --silent --head --fail http://localhost:3000/api/health); do
    if [ ${RETRY_COUNT} -ge ${MAX_RETRIES} ]; then
        echo "Error: Backend server did not start in time."
        exit 1
    fi
    printf "."
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT+1))
done

echo "\nBackend server is up. Running backend tests..."
node test-system.js

cd ..

# --- Frontend tests ---

echo "\n--- Starting Frontend Test Suite ---"

cd frontend

echo "Starting frontend server in background..."
# Use run.sh if it exists, otherwise run streamlit directly
if [ -f "run.sh" ]; then
    ./run.sh &
else
    streamlit run app.py &
fi
FRONTEND_PID=$!

echo "Waiting for frontend server to start (PID: $FRONTEND_PID)..."
sleep 10 # Give streamlit some time to start up

echo "Running frontend (API client) tests..."
python3 test-ui.py

cd ..

# --- Success ---
echo "\n---------------------------------"
echo "✅ All tests completed successfully!"
echo "---------------------------------"

# The 'trap' will handle the cleanup automatically upon exit
