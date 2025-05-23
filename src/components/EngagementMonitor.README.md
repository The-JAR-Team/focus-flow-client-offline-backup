# ONNX-Based Engagement Monitor

This project includes an on-device engagement prediction system using ONNX Runtime, which allows for real-time engagement monitoring without sending data to a server.

## Overview

The engagement monitor uses:
- MediaPipe Face Mesh for facial landmark detection
- ONNX Runtime Web for running the engagement prediction model
- A pre-trained GRU-Attention model (v4) for engagement prediction

## How It Works

1. The webcam captures video frames
2. MediaPipe Face Mesh extracts 478 facial landmarks from each frame
3. Frames are collected and preprocessed (normalized)
4. The ONNX model predicts engagement level locally on the device
5. Results are displayed in real-time without server communication

## Setup

The engagement model is included in the `public/models` directory. The system will automatically load and initialize the model when the engagement monitor component is mounted.

## Technical Details

- Model: Multi-task GRU-Attention neural network with regression and classification heads
- Input: 100 frames of 478 facial landmarks (x, y, z coordinates)
- Output: 
  - Engagement score (0.0 to 1.0)
  - Engagement class (Not Engaged, Barely Engaged, Engaged, Highly Engaged, SNP)

## Troubleshooting

If you encounter issues:
1. Check browser console for detailed error messages
2. Ensure the ONNX model file is in the correct location
3. Make sure your browser supports WebAssembly
4. Use the "Retry" button to reinitialize the system

## Privacy Benefits

This implementation processes all data locally on the device, meaning:
- No facial data is sent to any server
- Greater privacy for users
- Reduced latency
- Works offline once loaded
