// src/App.js

import React, { useEffect, useState, useRef } from 'react';
import { getRectangle, updateRectangle } from './services/api';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import debounce from 'lodash.debounce';
import './App.css';

function App() {
  const [rectangle, setRectangle] = useState({ width: 100, height: 100 });
  const [perimeter, setPerimeter] = useState(0);
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const svgRef = useRef(null);
  const connectionRef = useRef(null);
  const currentValidationId = useRef(null);

  const isDraggingRef = useRef(false);
  const rectangleRef = useRef(rectangle);

  useEffect(() => {
    rectangleRef.current = rectangle;
  }, [rectangle]);

  // Initialize the SignalR connection
  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl('http://localhost:5000/validationHub')
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    connection
      .start()
      .then(() => {
        console.log('Connected to SignalR hub');

        connection.on('ReceiveValidationResult', (data) => {
          console.log('Received validation result:', data);
          console.log('Current ValidationId:', currentValidationId.current);

          if (data.validationId === currentValidationId.current) {
            console.log('Validation IDs match. Setting error message.');
            setIsValidating(false);
            setError(data.errorMessage);
          } else {
            console.log('Validation IDs do not match. Ignoring message.');
          }
        });
      })
      .catch((error) => console.error('SignalR Connection Error:', error));

    connectionRef.current = connection;

    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
      }
    };
  }, []);

  // Fetch initial rectangle data
  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getRectangle();
        setRectangle(data);
        calculatePerimeter(data.width, data.height);
      } catch (err) {
        console.error(err);
      }
    }
    fetchData();
  }, []);

  const debouncedUpdate = useRef();

  useEffect(() => {
    debouncedUpdate.current = debounce(async (rect) => {
      setIsValidating(true);
      setError(''); 
      try {
        const validationId = await updateRectangle(rect);
        console.log('Received validationId from updateRectangle:', validationId);
        currentValidationId.current = validationId;
      } catch (err) {
        console.error('Failed to update rectangle:', err);
        setIsValidating(false);
      }
    }, 200);

    return () => {
      debouncedUpdate.current.cancel();
    };
  }, []);

  const calculatePerimeter = (width, height) => {
    setPerimeter(2 * (width + height));
  };

  const handleMouseDownRef = useRef();
  const handleMouseMoveRef = useRef();
  const handleMouseUpRef = useRef();

  useEffect(() => {
    handleMouseDownRef.current = (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDraggingRef.current = true;
      document.addEventListener('mousemove', handleMouseMoveRef.current);
      document.addEventListener('mouseup', handleMouseUpRef.current);
    };

    handleMouseMoveRef.current = (e) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();

      const svgRect = svgRef.current.getBoundingClientRect();
      const newWidth = e.clientX - svgRect.left - 50;
      const newHeight = e.clientY - svgRect.top - 50;

      const updatedRectangle = {
        ...rectangleRef.current,
        width: newWidth > 10 ? newWidth : 10,
        height: newHeight > 10 ? newHeight : 10,
      };

      rectangleRef.current = updatedRectangle;
      setRectangle(updatedRectangle);
      calculatePerimeter(updatedRectangle.width, updatedRectangle.height);

      debouncedUpdate.current(updatedRectangle);
    };

    handleMouseUpRef.current = (e) => {
      if (isDraggingRef.current) {
        e.preventDefault();
        isDraggingRef.current = false;
        document.removeEventListener('mousemove', handleMouseMoveRef.current);
        document.removeEventListener('mouseup', handleMouseUpRef.current);
      }
    };
  }, []); 
  return (
    <div>
      <svg
        ref={svgRef}
        width="600"
        height="400"
        style={{ border: '1px solid black', userSelect: 'none' }}
      >
        <rect
          x="50"
          y="50"
          width={rectangle.width}
          height={rectangle.height}
          fill="blue"
        />
        <circle
          cx={50 + rectangle.width}
          cy={50 + rectangle.height}
          r="8"
          fill="red"
          onMouseDown={(e) => handleMouseDownRef.current(e)}
          style={{ cursor: 'nwse-resize' }}
        />
      </svg>
      <p>Perimeter: {perimeter}</p>
      {isValidating && (
        <div className="spinner-container">
          <div className="spinner"></div>
          <p>Validation in progress...</p>
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default App;
