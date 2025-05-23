// Load ONNX model directly using fetch with no external dependencies
export const loadOnnxModelFromUrl = async (url) => {
  try {
    console.log(`Attempting to fetch ONNX model from: ${url}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/octet-stream',
        'Content-Type': 'application/octet-stream'
      },
      cache: 'no-cache',
      mode: 'cors',
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch model: ${response.status} ${response.statusText}`);
    }
    
    console.log(`Successfully fetched model from: ${url}`);
    return await response.arrayBuffer();
  } catch (error) {
    console.error(`Error fetching model from ${url}:`, error);
    return null;
  }
};

// Function to load the ONNX model from a URL or create a dataURL from a base64 string
export const getOnnxModelUri = async () => {
  // Try loading from URL first with various paths that might work
  const baseUrl = window.location.origin;
  const basePath = window.location.pathname.endsWith('/') 
    ? window.location.pathname 
    : window.location.pathname + '/';
  
  const urls = [
    './models/engagement_multitask_v4.onnx',
    '/models/engagement_multitask_v4.onnx',
    '/focus-flow-client/models/engagement_multitask_v4.onnx',
    baseUrl + '/models/engagement_multitask_v4.onnx',
    baseUrl + '/focus-flow-client/models/engagement_multitask_v4.onnx',
    baseUrl + basePath + 'models/engagement_multitask_v4.onnx',
    new URL('models/engagement_multitask_v4.onnx', baseUrl + basePath).href
  ];
  
  // Log all URLs we're going to try
  console.log('Attempting to load ONNX model from the following URLs:', urls);
  
  for (const url of urls) {
    const modelBuffer = await loadOnnxModelFromUrl(url);
    if (modelBuffer) {
      // Create a Blob from the buffer
      const blob = new Blob([modelBuffer], { type: 'application/octet-stream' });
      // Create a URL for the blob
      const modelUrl = URL.createObjectURL(blob);
      console.log(`Created ONNX model blob URL from ${url}`);
      return modelUrl;
    }
  }
  
  // If none of the URLs work, return null
  console.error('Failed to load ONNX model from any URL');
  return null;
};
