// ONNX Model Configuration System
// This file contains configurations for different ONNX models used for engagement prediction

/**
 * Available ONNX models with their specific configurations
 */
export const AVAILABLE_MODELS = {
  'v4': {
    id: 'v4',
    name: 'Engagement Multitask V4',
    filename: 'engagement_multitask_v4.onnx',
    description: 'Advanced multi-task model for engagement prediction with enhanced accuracy',
    version: '4.0',
    inputFormat: {
      sequenceLength: 100,
      numLandmarks: 478,
      numCoords: 3,
      tensorName: 'input',
      tensorShape: [1, 100, 478, 3],
      requiresNormalization: true,
      normalizationMethod: 'distance_based'
    },
    outputFormat: {
      tensorName: 'output',
      outputType: 'classification',
      numClasses: 5,
      classLabels: {
        0: 'Not Engaged',
        1: 'Barely Engaged', 
        2: 'Engaged',
        3: 'Highly Engaged',
        4: 'SNP'
      }
    },
    processingOptions: {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableProfiling: false
    },
    performance: {
      avgInferenceTime: '50-100ms',
      memoryUsage: 'Medium',
      accuracy: 'High'
    }
  },
  'v4_v2': {
    id: 'v4_v2',
    name: 'Engagement Multitask V4.2',
    filename: 'engagement_multitask_v4_v2.onnx',
    description: 'Enhanced multi-task model with improved training and better accuracy',
    version: '4.2',
    inputFormat: {
      sequenceLength: 30,
      numLandmarks: 478,
      numCoords: 3,
      tensorName: 'input_x',
      tensorShape: [1, 30, 478, 3],
      requiresNormalization: true,
      normalizationMethod: 'distance_based'
    },
    outputFormat: {
      tensorName: 'output',
      outputType: 'classification',
      numClasses: 5,
      classLabels: {
        0: 'Not Engaged',
        1: 'Barely Engaged',
        2: 'Engaged',
        3: 'Highly Engaged',
        4: 'SNP'
      },
      outputNames: ['regression_scores', 'classification_logits', 'attention_weights']
    },
    processingOptions: {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableProfiling: false
    },    performance: {
      avgInferenceTime: '40-80ms',
      memoryUsage: 'Medium',
      accuracy: 'Very High'
    }
  },

  'v4_v3': {
    id: 'v4_v3',
    name: 'Engagement Multitask V4.3',
    filename: 'multitask_v4_v3.onnx',
    description: 'Latest multi-task model with enhanced performance and accuracy',
    version: '4.3',
    inputFormat: {
      sequenceLength: 30,
      numLandmarks: 478,
      numCoords: 3,
      tensorName: 'input_x',
      tensorShape: [1, 30, 478, 3],
      requiresNormalization: true,
      normalizationMethod: 'distance_based'
    },
    outputFormat: {
      tensorName: 'output',
      outputType: 'classification',
      numClasses: 5,
      classLabels: {
        0: 'Not Engaged',
        1: 'Barely Engaged',
        2: 'Engaged',
        3: 'Highly Engaged',
        4: 'SNP'
      },
      outputNames: ['regression_scores', 'classification_logits', 'attention_weights']
    },
    processingOptions: {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableProfiling: false
    },    performance: {
      avgInferenceTime: '35-75ms',
      memoryUsage: 'Medium',
      accuracy: 'Excellent'
    }
  },

  'v4_v4': {
    id: 'v4_v4',
    name: 'Engagement Multitask V4.4',
    filename: 'multitask_v4_4.onnx',
    description: 'Latest multi-task model with further enhanced performance and accuracy',
    version: '4.4',
    inputFormat: {
      sequenceLength: 30,
      numLandmarks: 478,
      numCoords: 3,
      tensorName: 'input_x',
      tensorShape: [1, 30, 478, 3],
      requiresNormalization: true,
      normalizationMethod: 'distance_based'
    },
    outputFormat: {
      tensorName: 'output',
      outputType: 'classification',
      numClasses: 5,
      classLabels: {
        0: 'Not Engaged',
        1: 'Barely Engaged',
        2: 'Engaged',
        3: 'Highly Engaged',
        4: 'SNP'
      },
      outputNames: ['regression_scores', 'classification_logits', 'attention_weights']
    },
    processingOptions: {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableProfiling: false
    },    performance: {
      avgInferenceTime: '30-70ms',
      memoryUsage: 'Medium',
      accuracy: 'Excellent'
    }
  },

  'v4_v7': {
    id: 'v4_v7',
    name: 'Engagement Multitask V4.7',
    filename: 'multitask_v4_7.onnx',
    description: 'Advanced multi-task model with latest optimizations and enhanced accuracy',
    version: '4.7',
    inputFormat: {
      sequenceLength: 30,
      numLandmarks: 478,
      numCoords: 3,
      tensorName: 'input_x',
      tensorShape: [1, 30, 478, 3],
      requiresNormalization: true,
      normalizationMethod: 'distance_based'
    },
    outputFormat: {
      tensorName: 'output',
      outputType: 'classification',
      numClasses: 5,
      classLabels: {
        0: 'Not Engaged',
        1: 'Barely Engaged',
        2: 'Engaged',
        3: 'Highly Engaged',
        4: 'SNP'
      },
      outputNames: ['regression_scores', 'classification_logits', 'attention_weights']
    },
    processingOptions: {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableProfiling: false
    },
    performance: {
      avgInferenceTime: '25-65ms',
      memoryUsage: 'Medium',
      accuracy: 'Excellent'
    }
  },
  
  'v1': {
    id: 'v1',
    name: 'Engagement GRU V1',
    filename: 'v1.onnx',
    description: 'GRU-based model for basic engagement prediction',
    version: '1.0',
    inputFormat: {
      sequenceLength: 100,
      numLandmarks: 478,
      numCoords: 3,
      tensorName: 'input',
      tensorShape: [1, 100, 478, 3],
      requiresNormalization: true,
      normalizationMethod: 'distance_based'
    },
    outputFormat: {
      tensorName: 'output',
      outputType: 'classification',
      numClasses: 5,
      classLabels: {
        0: 'Not Engaged',
        1: 'Barely Engaged',
        2: 'Engaged', 
        3: 'Highly Engaged',
        4: 'SNP'
      }
    },    processingOptions: {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableProfiling: false
    },
    performance: {
      avgInferenceTime: '30-70ms',
      memoryUsage: 'Low',
      accuracy: 'Medium'
    }
  },
  
  'v3_gru_attention': {
    id: 'v3_gru_attention',
    name: 'GRU with Attention V3',
    filename: 'v3_gru_attention.onnx',
    description: 'GRU-based model with attention mechanism for enhanced engagement prediction',
    version: '3.0',
    inputFormat: {
      sequenceLength: 100,
      numLandmarks: 478,
      numCoords: 3,
      tensorName: 'input',
      tensorShape: [1, 100, 478, 3],
      requiresNormalization: true,
      normalizationMethod: 'distance_based'
    },
    outputFormat: {
      tensorName: 'output',
      outputType: 'classification',
      numClasses: 5,
      classLabels: {
        0: 'Not Engaged',
        1: 'Barely Engaged',
        2: 'Engaged', 
        3: 'Highly Engaged',
        4: 'SNP'
      }
    },
    processingOptions: {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
      enableProfiling: false
    },
    performance: {
      avgInferenceTime: '35-75ms',
      memoryUsage: 'Low-Medium',
      accuracy: 'High'
    }
  }
};

/**
 * Default model configuration
 */
export const DEFAULT_MODEL_ID = 'v4_v3';

/**
 * Current active model configuration
 * Can be changed at runtime using setActiveModel()
 */
let activeModelConfig = AVAILABLE_MODELS[DEFAULT_MODEL_ID];

/**
 * Get the currently active model configuration
 * @returns {Object} Active model configuration
 */
export const getActiveModelConfig = () => {
  return { ...activeModelConfig };
};

/**
 * Set the active model configuration
 * @param {string} modelId - ID of the model to activate
 * @returns {boolean} Success status
 */
export const setActiveModel = (modelId) => {
  if (!AVAILABLE_MODELS[modelId]) {
    console.error(`Model '${modelId}' not found. Available models:`, Object.keys(AVAILABLE_MODELS));
    return false;
  }
  
  activeModelConfig = AVAILABLE_MODELS[modelId];
  console.log(`Active model changed to: ${activeModelConfig.name} (${modelId})`);
  
  // Store preference in localStorage
  try {
    localStorage.setItem('focusflow_active_model', modelId);
  } catch (error) {
    console.warn('Failed to save model preference to localStorage:', error);
  }
  
  return true;
};

/**
 * Get list of available model IDs
 * @returns {string[]} Array of model IDs
 */
export const getAvailableModelIds = () => {
  return Object.keys(AVAILABLE_MODELS);
};

/**
 * Get detailed information about all available models
 * @returns {Object} Object containing all model configurations
 */
export const getAllModelConfigs = () => {
  return { ...AVAILABLE_MODELS };
};

/**
 * Get model configuration by ID
 * @param {string} modelId - ID of the model
 * @returns {Object|null} Model configuration or null if not found
 */
export const getModelConfig = (modelId) => {
  return AVAILABLE_MODELS[modelId] ? { ...AVAILABLE_MODELS[modelId] } : null;
};

/**
 * Generate possible paths for a model file
 * @param {string} filename - Model filename
 * @returns {string[]} Array of possible paths
 */
export const getModelPaths = (filename) => {
  return [
    `./models/${filename}`,
    `/models/${filename}`,
    `/focus-flow-client/models/${filename}`,
    `../hooks/${filename}`,
    `${window.location.pathname}models/${filename}`,
    `${window.location.origin}/models/${filename}`,
    `${window.location.origin}/focus-flow-client/models/${filename}`,
    `${window.location.origin}${window.location.pathname}models/${filename}`
  ];
};

/**
 * Validate model configuration
 * @param {Object} config - Model configuration to validate
 * @returns {boolean} Whether the configuration is valid
 */
export const validateModelConfig = (config) => {
  const requiredFields = [
    'id', 'name', 'filename', 'inputFormat', 'outputFormat'
  ];
  
  const requiredInputFields = [
    'sequenceLength', 'numLandmarks', 'numCoords', 'tensorName', 'tensorShape'
  ];
  
  const requiredOutputFields = [
    'tensorName', 'outputType', 'numClasses'
  ];
  
  // Check required top-level fields
  for (const field of requiredFields) {
    if (!config[field]) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
  }
  
  // Check required input format fields
  for (const field of requiredInputFields) {
    if (!config.inputFormat[field]) {
      console.error(`Missing required inputFormat field: ${field}`);
      return false;
    }
  }
  
  // Check required output format fields
  for (const field of requiredOutputFields) {
    if (!config.outputFormat[field]) {
      console.error(`Missing required outputFormat field: ${field}`);
      return false;
    }
  }
  
  return true;
};

/**
 * Initialize model configuration system
 * Attempts to restore previously selected model from localStorage
 */
export const initializeModelConfig = () => {
  try {
    const savedModelId = localStorage.getItem('focusflow_active_model');
    if (savedModelId && AVAILABLE_MODELS[savedModelId]) {
      setActiveModel(savedModelId);
      console.log(`Restored active model from localStorage: ${savedModelId}`);
    } else {
      console.log(`Using default model: ${DEFAULT_MODEL_ID}`);
    }
  } catch (error) {
    console.warn('Failed to restore model preference from localStorage:', error);
    console.log(`Using default model: ${DEFAULT_MODEL_ID}`);
  }
};

// Auto-initialize on module load
initializeModelConfig();
