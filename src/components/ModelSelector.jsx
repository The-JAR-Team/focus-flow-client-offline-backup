import React, { useState, useEffect } from 'react';
import { ONNX_CONFIG } from '../config/config';
import { 
  getCurrentModelInfo, 
  switchModel, 
  getAvailableModels, 
  isModelLoaded,
  reloadCurrentModel 
} from '../services/engagementOnnxService';
import '../styles/ModelSelector.css';

const ModelSelector = () => {
  const [currentModel, setCurrentModel] = useState(null);
  const [availableModels, setAvailableModels] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState('Unknown');
  const [showDetails, setShowDetails] = useState(false);

  // Load model information on component mount
  useEffect(() => {
    loadModelInfo();
    checkModelStatus();
  }, []);

  const loadModelInfo = async () => {
    try {
      const current = getCurrentModelInfo();
      const available = await getAvailableModels();
      
      setCurrentModel(current);
      setAvailableModels(available);
    } catch (error) {
      console.error('Failed to load model information:', error);
    }
  };

  const checkModelStatus = () => {
    const loaded = isModelLoaded();
    setModelStatus(loaded ? 'Loaded' : 'Not Loaded');
  };

  const handleModelSwitch = async (modelId) => {
    if (modelId === currentModel?.id) {
      return; // Already using this model
    }

    setIsLoading(true);
    try {
      const success = await switchModel(modelId);
      if (success) {
        await loadModelInfo();
        setModelStatus('Not Loaded'); // Will be loaded on next prediction
        console.log(`Successfully switched to model: ${modelId}`);
      } else {
        console.error(`Failed to switch to model: ${modelId}`);
      }
    } catch (error) {
      console.error('Error switching model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReloadModel = async () => {
    setIsLoading(true);
    try {
      const success = await reloadCurrentModel();
      if (success) {
        setModelStatus('Loaded');
        console.log('Model reloaded successfully');
      } else {
        console.error('Failed to reload model');
      }
    } catch (error) {
      console.error('Error reloading model:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if model selection is disabled
  if (!ONNX_CONFIG.showModelSelector) {
    return null;
  }

  return (
    <div className="model-selector">
      <div className="model-selector-header">
        <h3>🧠 ONNX Model</h3>
        <button 
          className="toggle-details-btn"
          onClick={() => setShowDetails(!showDetails)}
          aria-label="Toggle model details"
        >
          {showDetails ? '▼' : '▶'}
        </button>
      </div>

      <div className="current-model-info">
        <div className="model-status">
          <span className="model-name">
            {currentModel ? currentModel.name : 'Loading...'}
          </span>
          <span className={`status-indicator ${modelStatus.toLowerCase().replace(' ', '-')}`}>
            {modelStatus}
          </span>
        </div>
        
        {currentModel && (
          <div className="model-version">
            v{currentModel.version} ({currentModel.id})
          </div>
        )}
      </div>

      {showDetails && (
        <div className="model-details">
          {currentModel && (
            <div className="current-model-details">
              <h4>Current Model Details</h4>
              <div className="detail-row">
                <span>Description:</span>
                <span>{currentModel.description}</span>
              </div>
              <div className="detail-row">
                <span>Performance:</span>
                <span>
                  {currentModel.performance.accuracy} Accuracy, 
                  {currentModel.performance.avgInferenceTime} Inference
                </span>
              </div>
              <div className="detail-row">
                <span>Memory Usage:</span>
                <span>{currentModel.performance.memoryUsage}</span>
              </div>
            </div>
          )}          <div className="model-selection">
            <div className="model-selection-header">
              <h4>Available Models</h4>
              <button 
                className="reload-model-btn"
                onClick={handleReloadModel}
                disabled={isLoading}
                title="Reload current model"
              >
                {isLoading ? '⏳' : 'Click To Reload 🔄'}
              </button>
            </div>
            <div className="model-list">
              {Object.values(availableModels).map((model) => (
                <button
                  key={model.id}
                  className={`model-option ${currentModel?.id === model.id ? 'active' : ''}`}
                  onClick={() => handleModelSwitch(model.id)}
                  disabled={isLoading || currentModel?.id === model.id}
                >
                  <div className="model-option-header">
                    <span className="model-option-name">{model.name}</span>
                    <span className="model-option-version">v{model.version}</span>
                  </div>
                  <div className="model-option-description">
                    {model.description}
                  </div>
                  <div className="model-option-performance">
                    {model.performance.accuracy} • {model.performance.avgInferenceTime}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
