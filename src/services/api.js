const API_BASE_URL = 'http://localhost:5000'; 

export async function getRectangle() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rectangle`);
    if (!response.ok) {
      throw new Error(`Error fetching rectangle: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch rectangle:', error);
    throw error;
  }
}

export async function updateRectangle(rectangle) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rectangle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rectangle),
    });
    const data = await response.json();
    return data.validationId;
  } catch (error) {
    console.error('Failed to update rectangle:', error);
  }
}
